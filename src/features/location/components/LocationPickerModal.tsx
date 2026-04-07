"use client";

/* eslint-disable @next/next/no-img-element */

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { getAddressWeb } from "@/api";
import { searchLocations } from "@/features/location/data/location-service";
import { LocationSuggestion } from "@/features/location/domain/location";
import { useLocation } from "@/features/location/context/location-context";
import { useAppDispatch, useAppSelector } from "@/features/cart/store/hooks";
import { selectedAddress, setAddresses, setCurrentLoc, setError, setLoading, setselectedGps } from "@/redux/slices";
import { notifyOrAlert } from "@/shared/lib/notify";
import styles from "./LocationPickerModal.module.css";

type LocationPickerModalProps = {
  open: boolean;
  onClose: () => void;
  onAddressSelected?: (addressId: string) => void;
};

type AddressItem = {
  _id: string;
  building?: string;
  locality?: string;
  city?: string;
  state?: string;
  area_code?: string;
  country?: string;
  gps?: string;
};

const toLocationLabel = (address: AddressItem) => {
  const first = address.locality || address.building || address.city || "Selected area";
  return first;
};

const parseGps = (gps?: string) => {
  const [latStr, lngStr] = (gps || "").split(",");
  const lat = Number(latStr || 0);
  const lng = Number(lngStr || 0);
  return { lat, lng };
};

export function LocationPickerModal({ open, onClose, onAddressSelected }: LocationPickerModalProps) {
  const dispatch = useAppDispatch();
  const loginName = useAppSelector((state) => state.authToken.loginName);
  const isUserLoggedIn = loginName === "USER";
  const allAddress = useAppSelector((state) => state.allAddress.allAddress as AddressItem[]);
  const selectedAddressState = useAppSelector((state) => state.location.selectAddress as AddressItem | null);
  const { location, error, isResolving, setLocation, resolveCurrentLocation } = useLocation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LocationSuggestion[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const deferredQuery = useDeferredValue(query);

  const selectedMapUrl = useMemo(() => {
    const source = results[0] ?? location;

    if (!source) {
      return null;
    }

    return `https://www.openstreetmap.org/?mlat=${source.lat}&mlon=${source.lng}#map=15/${source.lat}/${source.lng}`;
  }, [location, results]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const trimmed = deferredQuery.trim();

    if (trimmed.length < 3) {
      setResults([]);
      setSearchError(null);
      setLoadingResults(false);
      return;
    }

    let active = true;
    setLoadingResults(true);
    setSearchError(null);

    const timer = window.setTimeout(() => {
      void searchLocations(trimmed)
        .then((items) => {
          if (active) {
            setResults(items);
          }
        })
        .catch(() => {
          if (active) {
            setSearchError("Unable to search locations right now.");
          }
        })
        .finally(() => {
          if (active) {
            setLoadingResults(false);
          }
        });
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [deferredQuery, open]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setSearchError(null);
      setLoadingResults(false);
      return;
    }

    if (selectedAddressState?._id) {
      setSelectedAddressId(selectedAddressState._id);
    }
  }, [open, selectedAddressState?._id]);

  useEffect(() => {
    if (!open || !isUserLoggedIn) {
      return;
    }

    const getAllAddress = async () => {
      try {
        dispatch(setLoading(true));
        const response = await getAddressWeb() as { data?: unknown };
        const dataBucket = response?.data;
        const payload = Array.isArray(dataBucket) ? dataBucket : (dataBucket as { data?: unknown })?.data;
        const payloadRecord =
          typeof payload === "object" && payload !== null ? (payload as { data?: unknown }) : undefined;
        const incoming = (Array.isArray(payload)
          ? payload
          : Array.isArray(payloadRecord?.data)
            ? payloadRecord.data
            : Array.isArray(response?.data)
              ? response.data
              : []) as AddressItem[];

        dispatch(setAddresses(incoming));
        if (!incoming?.length) {
          notifyOrAlert("No addresses found", "info");
          dispatch(setError("No addresses found"));
        }
      } catch (fetchError) {
        console.error(fetchError);
        notifyOrAlert("Failed to fetch addresses", "error");
        dispatch(setError("Failed to fetch addresses"));
      } finally {
        dispatch(setLoading(false));
      }
    };

    void getAllAddress();
  }, [open, isUserLoggedIn, dispatch]);

  const applyAddressSelection = (address: AddressItem) => {
    const parsed = parseGps(address.gps);
    dispatch(selectedAddress(address));
    dispatch(setselectedGps(address.gps || `${parsed.lat},${parsed.lng}`));
    dispatch(
      setCurrentLoc({
        city: address.city || "",
        pincode: address.area_code || "",
        latitude: parsed.lat,
        longitude: parsed.lng,
      }),
    );

    setLocation({
      city: address.city || "City",
      pincode: address.area_code || "000000",
      label: toLocationLabel(address),
      lat: parsed.lat || 0,
      lng: parsed.lng || 0,
    });

    if (onAddressSelected) {
      onAddressSelected(address._id);
    }

    onClose();
  };

  if (!open) {
    return null;
  }

  return (
    <div className={styles.backdrop} role="presentation" onClick={onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="location-picker-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.header}>
          <div>
            <p className={styles.kicker}>Delivery location</p>
            <h2 id="location-picker-title">Choose your area</h2>
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose}>
            Close
          </button>
        </div>

        <div className={styles.inputRow}>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search city, locality, or pincode"
          />
          <button type="button" className={styles.primaryButton} onClick={resolveCurrentLocation}>
            Use Current Location
          </button>
        </div>

        <div className={styles.actionsRow}>
          <span className={styles.statusText}>
            {isResolving ? "Detecting current location..." : error ?? "Search or pick a map location"}
          </span>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => {
              if (selectedMapUrl) {
                window.open(selectedMapUrl, "_blank", "noopener,noreferrer");
              }
            }}
            disabled={!selectedMapUrl}
          >
            Locate on Map
          </button>
        </div>

        <div className={styles.currentCard}>
          <span className={styles.label}>Selected</span>
          <strong>{location?.label ?? "No location selected yet"}</strong>
        </div>

        {isUserLoggedIn ? (
          <div className={styles.savedAddresses}>
            <div className={styles.savedHeader}>
              <span className={styles.label}>Saved Addresses</span>
            </div>
            {allAddress?.length ? (
              <div className={styles.savedList}>
                {allAddress.map((address) => (
                  <button
                    key={address._id}
                    type="button"
                    className={`${styles.savedItem} ${selectedAddressId === address._id ? styles.savedItemSelected : ""}`}
                    onClick={() => {
                      setSelectedAddressId(address._id);
                      applyAddressSelection(address);
                    }}
                  >
                    <div>
                      <strong>{address.building || address.locality || address.city || "Address"}</strong>
                      <p>{`${address.locality || ""}, ${address.city || ""}, ${address.state || ""} - ${address.area_code || ""}`}</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className={styles.emptyText}>No saved addresses found.</p>
            )}
          </div>
        ) : null}

        <div className={styles.results}>
          {loadingResults ? <p className={styles.emptyText}>Searching locations...</p> : null}
          {searchError ? <p className={styles.errorText}>{searchError}</p> : null}

          {!loadingResults && results.length === 0 && query.trim().length >= 3 ? (
            <p className={styles.emptyText}>No matching locations found.</p>
          ) : null}

          {results.map((item) => (
            <button
              key={`${item.lat}-${item.lng}`}
              type="button"
              className={styles.resultItem}
              onClick={() => {
                setLocation(item);
                dispatch(setselectedGps(`${item.lat},${item.lng}`));
                dispatch(
                  setCurrentLoc({
                    city: item.city,
                    pincode: item.pincode,
                    latitude: item.lat,
                    longitude: item.lng,
                  }),
                );
                onClose();
              }}
            >
              <div>
                <strong>{item.label}</strong>
                <p>{item.rawLabel}</p>
              </div>
              <span>Select</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
