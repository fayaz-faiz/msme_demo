"use client";

/* eslint-disable @next/next/no-img-element */

import { useCallback, useDeferredValue, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteAddressDataWeb, getAddressWeb } from "@/api";
import { searchLocations } from "@/features/location/data/location-service";
import { LocationSuggestion } from "@/features/location/domain/location";
import { useLocation } from "@/features/location/context/location-context";
import { useAppDispatch, useAppSelector } from "@/features/cart/store/hooks";
import {
  selectedAddress,
  setAddresses,
  setCurrentLoc,
  setError,
  setLoading,
  setselectedGps,
} from "@/redux/slices";
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
  location_type?: string;
};

const toLocationLabel = (address: AddressItem) =>
  address.locality || address.building || address.city || "Selected area";

const parseGps = (gps?: string) => {
  const [latStr, lngStr] = (gps || "").split(",");
  return { lat: Number(latStr || 0), lng: Number(lngStr || 0) };
};

/* ── Inline SVG icons ── */
function IconX() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

function IconPin() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M20 10c0 6-8 13-8 13S4 16 4 10a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function IconGps() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconHome() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function IconOffice() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      <line x1="12" y1="12" x2="12" y2="12.01" />
      <path d="M2 12h20" />
    </svg>
  );
}

function IconMapPin() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function AddressTypeIcon({ type }: { type?: string }) {
  const t = (type || "").toLowerCase();
  if (t === "home") return <IconHome />;
  if (t === "office" || t === "work") return <IconOffice />;
  return <IconMapPin />;
}

function IconEdit() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function IconChevron() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

export function LocationPickerModal({
  open,
  onClose,
  onAddressSelected,
}: LocationPickerModalProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const loginName = useAppSelector((state) => state.authToken.loginName);
  const isUserLoggedIn = loginName === "USER";
  const allAddress = useAppSelector(
    (state) => state.allAddress.allAddress as AddressItem[],
  );
  const selectedAddressState = useAppSelector(
    (state) => state.location.selectAddress as AddressItem | null,
  );
  const { location, setLocation, resolveCurrentLocation } = useLocation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LocationSuggestion[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [deletingAddressId, setDeletingAddressId] = useState("");
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    if (!open) return;
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
          if (active) setResults(items);
        })
        .catch(() => {
          if (active) setSearchError("Unable to search locations right now.");
        })
        .finally(() => {
          if (active) setLoadingResults(false);
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

  const getAllAddress = useCallback(async () => {
    try {
      dispatch(setLoading(true));
      const response = (await getAddressWeb()) as { data?: unknown };
      const dataBucket = response?.data;
      const payload = Array.isArray(dataBucket)
        ? dataBucket
        : (dataBucket as { data?: unknown })?.data;
      const payloadRecord =
        typeof payload === "object" && payload !== null
          ? (payload as { data?: unknown })
          : undefined;
      const incoming = (
        Array.isArray(payload)
          ? payload
          : Array.isArray(payloadRecord?.data)
            ? payloadRecord.data
            : Array.isArray(response?.data)
              ? response.data
              : []
      ) as AddressItem[];
      dispatch(setAddresses(incoming));
      if (!incoming?.length) dispatch(setError("No addresses found"));
    } catch (fetchError) {
      console.error(fetchError);
      notifyOrAlert("Failed to fetch addresses", "error");
      dispatch(setError("Failed to fetch addresses"));
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch]);

  useEffect(() => {
    if (!open || !isUserLoggedIn) return;
    void getAllAddress();
  }, [open, isUserLoggedIn, getAllAddress]);

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
    if (onAddressSelected) onAddressSelected(address._id);
    onClose();
  };

  const navigateToAddAddress = () => {
    onClose();
    router.push("/profile/my-addresses/add");
  };
  const navigateToEditAddress = (addressId: string) => {
    onClose();
    router.push(`/profile/my-addresses/edit/${addressId}`);
  };

  const handleDeleteAddress = async (addressId: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to remove this address?",
    );
    if (!confirmed || deletingAddressId) return;
    setDeletingAddressId(addressId);
    try {
      const response = (await deleteAddressDataWeb({ id: addressId })) as {
        data?: { status?: boolean; data?: { message?: string } };
      };
      if (response?.data?.status === true) {
        notifyOrAlert(
          response?.data?.data?.message || "Address deleted successfully",
          "success",
        );
        if (selectedAddressId === addressId) setSelectedAddressId("");
        await getAllAddress();
      } else {
        notifyOrAlert("Unable to delete address.", "error");
      }
    } catch (error) {
      console.error(error);
      notifyOrAlert("Unable to delete address.", "error");
    } finally {
      setDeletingAddressId("");
    }
  };

  if (!open) return null;

  const showDropdown = query.trim().length >= 3;

  return (
    <div className={styles.backdrop} role="presentation" onClick={onClose}>
      <div
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby="location-picker-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className={styles.handle} />

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.titleGroup}>
            <p className={styles.kicker}>Delivery to</p>
            <h2 id="location-picker-title" className={styles.title}>
              Choose your area
            </h2>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close"
          >
            <IconX />
          </button>
        </div>

        <div className={styles.divider} />

        {/* Search */}
        <div className={styles.searchWrap}>
          <div className={styles.searchBox}>
            <span className={styles.searchIcon}>
              <IconSearch />
            </span>
            <input
              className={styles.searchInput}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search city, locality or pincode…"
              autoComplete="off"
            />
          </div>

          {showDropdown && (
            <div className={styles.searchDropdown}>
              {loadingResults && (
                <p className={styles.dropdownMsg}>Searching…</p>
              )}
              {searchError && (
                <p className={styles.dropdownError}>{searchError}</p>
              )}
              {!loadingResults && !searchError && results.length === 0 && (
                <p className={styles.dropdownMsg}>
                  No matching locations found.
                </p>
              )}
              {!loadingResults &&
                !searchError &&
                results.map((item) => (
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
                      setQuery(item.rawLabel);
                      setResults([]);
                      onClose();
                    }}
                  >
                    <span className={styles.resultPin}>
                      <IconPin />
                    </span>
                    <span className={styles.resultText}>
                      <span className={styles.resultLabel}>{item.label}</span>
                      <span className={styles.resultSub}>{item.rawLabel}</span>
                    </span>
                    <span className={styles.resultArrow}>
                      <IconChevron />
                    </span>
                  </button>
                ))}
            </div>
          )}
        </div>

        {/* Body */}
        <div className={styles.body}>
          {/* Quick actions */}
          <div className={styles.quickRow}>
            <button
              type="button"
              className={styles.quickBtn}
              onClick={resolveCurrentLocation}
            >
              <IconGps />
              Use current location
            </button>
            {isUserLoggedIn && (
              <button
                type="button"
                className={styles.quickBtn}
                onClick={navigateToAddAddress}
              >
                <IconPlus />
                Add address
              </button>
            )}
          </div>

          {/* Selected location */}
          {location?.label && (
            <>
              <p className={styles.sectionLabel}>Current location</p>
              <div className={styles.selectedCard}>
                <div className={styles.selectedIcon}>
                  <IconPin />
                </div>
                <div className={styles.selectedText}>
                  <p className={styles.selectedMeta}>Delivering to</p>
                  <p className={styles.selectedName}>{location.label}</p>
                </div>
              </div>
            </>
          )}

          {/* Saved addresses */}
          {isUserLoggedIn && (
            <>
              <p className={styles.sectionLabel}>Saved addresses</p>
              {allAddress?.length ? (
                <div className={styles.savedList}>
                  {allAddress.map((address) => (
                    <div
                      key={address._id}
                      className={`${styles.savedItem} ${selectedAddressId === address._id ? styles.savedItemSelected : ""}`}
                      onClick={() => {
                        setSelectedAddressId(address._id);
                        applyAddressSelection(address);
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedAddressId(address._id);
                          applyAddressSelection(address);
                        }
                      }}
                    >
                      <div className={styles.addrIcon}>
                        <AddressTypeIcon type={address.location_type} />
                      </div>
                      <div className={styles.savedMain}>
                        <p className={styles.savedTitle}>
                          {address.building ||
                            address.locality ||
                            address.city ||
                            "Address"}
                        </p>
                        <p className={styles.savedSub}>
                          {[
                            address.locality,
                            address.city,
                            address.state,
                            address.area_code,
                          ]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      </div>
                      <div className={styles.savedActions}>
                        <button
                          type="button"
                          className={styles.iconBtn}
                          aria-label="Edit address"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigateToEditAddress(address._id);
                          }}
                        >
                          <IconEdit />
                        </button>
                        <button
                          type="button"
                          className={styles.iconBtn}
                          aria-label="Delete address"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleDeleteAddress(address._id);
                          }}
                          disabled={deletingAddressId === address._id}
                        >
                          <IconTrash />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.emptyState}>
                  <p className={styles.emptyText}>No saved addresses yet</p>
                  <button
                    type="button"
                    className={styles.addFirstBtn}
                    onClick={navigateToAddAddress}
                  >
                    Add your first address
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
