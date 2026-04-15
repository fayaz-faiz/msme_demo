"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getAddressWeb, postAddAddress, updateAddress } from "@/api";
import { useAppDispatch } from "@/features/cart/store/hooks";
import { reverseGeocode, searchLocations } from "@/features/location/data/location-service";
import type { LocationSuggestion } from "@/features/location/domain/location";
import { useLocation } from "@/features/location/context/location-context";
import { selectedAddress, setCurrentLoc, setselectedGps } from "@/redux/slices";
import { notifyOrAlert } from "@/shared/lib/notify";
import styles from "./AddressEditor.module.css";

type AddressItem = {
  _id: string;
  name?: string;
  building?: string;
  locality?: string;
  city?: string;
  state?: string;
  country?: string;
  area_code?: string;
  mobileNumber?: string;
  mobile_number?: string;
  phone?: string;
  mobile?: string;
  mobileNumberCountryCode?: string;
  email?: string;
  gps?: string;
  address_type?: string;
  location_type?: string;
};

type AddressEditorProps = {
  mode: "add" | "edit";
  addressId?: string;
};

type AddressPayload = {
  name: string;
  building: string;
  city: string;
  state: string;
  country: string;
  area_code: string;
  locality: string;
  mobileNumber: string;
  mobileNumberCountryCode: string;
  email: string;
  gps: string;
  address_type: string;
  location_type: string;
  id?: string;
};

function parseGps(gps?: string) {
  const [latStr, lngStr] = String(gps || "").split(",");
  const lat = Number(latStr || 0);
  const lng = Number(lngStr || 0);
  return {
    lat: Number.isFinite(lat) ? lat : 0,
    lng: Number.isFinite(lng) ? lng : 0,
  };
}

function formatCoordinate(value: number) {
  return Number.isFinite(value) ? value.toFixed(6) : "0.000000";
}

function formatGps(lat: number, lng: number) {
  return `${formatCoordinate(lat)},${formatCoordinate(lng)}`;
}

function extractAddresses(response: unknown): AddressItem[] {
  const typed = response as {
    data?: unknown;
    message?: unknown;
  };
  const directData = typed?.data as { data?: unknown } | AddressItem[] | undefined;
  if (Array.isArray(directData)) {
    return directData as AddressItem[];
  }
  if (Array.isArray((directData as { data?: unknown })?.data)) {
    return (directData as { data?: AddressItem[] }).data || [];
  }
  if (Array.isArray(typed?.message)) {
    return typed.message as AddressItem[];
  }
  return [];
}

function getReadableError(error: unknown, fallback: string) {
  const typed = error as {
    response?: { data?: { message?: unknown; data?: { message?: unknown } } };
    message?: unknown;
    data?: { message?: unknown; data?: { message?: unknown } };
  };
  return String(
    typed?.response?.data?.message ||
      typed?.response?.data?.data?.message ||
      typed?.message ||
      typed?.data?.message ||
      typed?.data?.data?.message ||
      fallback,
  );
}

function resolveAddressPhone(address?: AddressItem) {
  if (!address) {
    return "";
  }

  const candidate = String(
    address.mobileNumber || address.mobile_number || address.phone || address.mobile || "",
  );

  return candidate.replace(/\D/g, "").slice(0, 10);
}

export function AddressEditor({ mode, addressId }: AddressEditorProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { location, resolveCurrentLocation, setLocation } = useLocation();

  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<LocationSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loadingCurrent, setLoadingCurrent] = useState(false);
  const [loadingAddress, setLoadingAddress] = useState(mode === "edit");

  const [lat, setLat] = useState(0);
  const [lng, setLng] = useState(0);
  const [fullAddress, setFullAddress] = useState("");
  const [pincode, setPincode] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [country, setCountry] = useState("India");
  const [locationConfirmed, setLocationConfirmed] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [houseNumber, setHouseNumber] = useState("");
  const [locality, setLocality] = useState("");
  const [saveAs, setSaveAs] = useState("Home");

  const mapEmbedUrl = useMemo(() => {
    const delta = 0.01;
    const left = lng - delta;
    const right = lng + delta;
    const top = lat + delta;
    const bottom = lat - delta;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${lat}%2C${lng}`;
  }, [lat, lng]);

  const updatePosition = async (nextLat: number, nextLng: number) => {
    setLat(nextLat);
    setLng(nextLng);
    dispatch(setselectedGps(formatGps(nextLat, nextLng)));
    const resolved = await reverseGeocode(nextLat, nextLng);
    if (resolved) {
      setFullAddress(resolved.label);
      setCity(resolved.city);
      setPincode(resolved.pincode);
      setStateName(String(resolved.state || ""));
      setLocation(resolved);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      if (mode === "edit" && addressId) {
        try {
          const response = await getAddressWeb();
          const addresses = extractAddresses(response);
          const current = addresses.find((entry) => entry._id === addressId);
          if (!current) {
            notifyOrAlert("Address not found.", "warning");
            router.replace("/profile/my-addresses");
            return;
          }
          const coords = parseGps(current.gps);
          setLat(coords.lat);
          setLng(coords.lng);
          setFullAddress(
            [current.building, current.locality, current.city, current.state, current.area_code].filter(Boolean).join(", "),
          );
          setPincode(String(current.area_code || ""));
          setCity(String(current.city || ""));
          setStateName(String(current.state || ""));
          setCountry(String(current.country || "India"));
          setName(String(current.name || ""));
          setPhone(resolveAddressPhone(current));
          setEmail(String(current.email || ""));
          setHouseNumber(String(current.building || ""));
          setLocality(String(current.locality || ""));
          setSaveAs(String(current.location_type || "Home"));
          setLocationConfirmed(true);
        } catch (error) {
          notifyOrAlert(getReadableError(error, "Unable to load address."), "error");
        } finally {
          setLoadingAddress(false);
        }
        return;
      }

      if (location) {
        setLat(location.lat);
        setLng(location.lng);
        setFullAddress(location.label);
        setPincode(location.pincode);
        setCity(location.city);
        setStateName(String(location.state || ""));
        setCountry("India");
        setLoadingAddress(false);
        return;
      }

      try {
        setLoadingCurrent(true);
        await resolveCurrentLocation();
      } finally {
        setLoadingCurrent(false);
      }
      setLoadingAddress(false);
    };
    void initialize();
  }, [addressId, location, mode, resolveCurrentLocation, router]);

  useEffect(() => {
    if (!query.trim() || query.trim().length < 3) {
      setSearchResults([]);
      return;
    }
    let active = true;
    const timer = window.setTimeout(() => {
      setSearching(true);
      void searchLocations(query.trim())
        .then((items) => {
          if (active) {
            setSearchResults(items);
          }
        })
        .catch(() => {
          if (active) {
            setSearchResults([]);
          }
        })
        .finally(() => {
          if (active) {
            setSearching(false);
          }
        });
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query]);

  const handleUseCurrentLocation = async () => {
    setLoadingCurrent(true);
    await resolveCurrentLocation();
    if (location) {
      await updatePosition(location.lat, location.lng);
    }
    setLoadingCurrent(false);
  };

  const handleConfirmLocation = () => {
    if (!lat || !lng) {
      notifyOrAlert("Please select a location first.", "warning");
      return;
    }
    setLocationConfirmed(true);
  };

  const validatePayload = () => {
    const normalizedPhone = phone.replace(/\D/g, "");
    if (name.trim().length < 3) {
      notifyOrAlert("Please enter a valid name.", "warning");
      return false;
    }
    if (houseNumber.trim().length < 3) {
      notifyOrAlert("Please enter valid flat or house details.", "warning");
      return false;
    }
    if (locality.trim().length < 3) {
      notifyOrAlert("Please enter valid block or area details.", "warning");
      return false;
    }
    if (!/^[6-9]\d{9}$/.test(normalizedPhone) || /^(\d)\1{9}$/.test(normalizedPhone)) {
      notifyOrAlert("Please enter a valid phone number.", "warning");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      notifyOrAlert("Please enter a valid email.", "warning");
      return false;
    }
    if (!pincode.trim()) {
      notifyOrAlert("Pincode is required.", "warning");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validatePayload() || isSaving) {
      return;
    }

    const payload: AddressPayload = {
      name: name.trim(),
      building: houseNumber.trim(),
      city: city.trim(),
      state: stateName.trim(),
      country: country.trim() || "India",
      area_code: pincode.trim(),
      locality: locality.trim(),
      mobileNumber: phone.replace(/\D/g, ""),
      mobileNumberCountryCode: "+91",
      email: email.trim(),
      gps: formatGps(lat, lng),
      address_type: "BILLING",
      location_type: saveAs,
    };

    if (mode === "edit" && addressId) {
      payload.id = addressId;
    }

    setIsSaving(true);
    try {
      let resolvedAddressId = addressId || "";
      if (mode === "add") {
        const response = await postAddAddress(payload) as {
          data?: { status?: boolean; data?: { data?: unknown; message?: unknown } };
        };
        const success = response?.data?.status === true;
        if (!success) {
          notifyOrAlert("Unable to add address.", "error");
          return;
        }
        resolvedAddressId = String(response?.data?.data?.data || "");
        notifyOrAlert(String(response?.data?.data?.message || "Address Added successfully"), "success");
      } else {
        const response = await updateAddress(payload) as {
          data?: { status?: boolean; data?: { message?: unknown } };
        };
        const success = response?.data?.status === true;
        if (!success) {
          notifyOrAlert("Unable to update address.", "error");
          return;
        }
        notifyOrAlert(String(response?.data?.data?.message || "Address updated successfully"), "success");
      }

      const selected = {
        _id: resolvedAddressId,
        building: houseNumber.trim(),
        locality: locality.trim(),
        city: city.trim(),
        state: stateName.trim(),
        country: country.trim() || "India",
        area_code: pincode.trim(),
        gps: formatGps(lat, lng),
      };
      dispatch(selectedAddress(selected));
      dispatch(setselectedGps(formatGps(lat, lng)));
      dispatch(setCurrentLoc({ city: city.trim(), pincode: pincode.trim(), latitude: lat, longitude: lng }));
      setLocation({
        city: city.trim() || "City",
        state: stateName.trim(),
        pincode: pincode.trim() || "000000",
        label: `${city.trim() || "City"}, ${pincode.trim() || "000000"}`,
        lat,
        lng,
      });
      router.push("/");
    } catch (error) {
      notifyOrAlert(getReadableError(error, "Unable to save address."), "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (loadingAddress) {
    return (
      <section className={styles.page}>
        <article className={styles.card}>
          <p>Loading address details...</p>
        </article>
      </section>
    );
  }

  return (
    <section className={styles.page}>
      <article className={styles.card}>
        <div className={styles.header}>
          <div>
            <p className={styles.kicker}>Profile</p>
            <h1>{mode === "add" ? "Add New Address" : "Edit Address"}</h1>
          </div>
          <button type="button" className={styles.secondaryButton} onClick={() => router.push("/profile/my-addresses")}>
            Back
          </button>
        </div>

        <div className={styles.locationPanel}>
          <div className={styles.locationTools}>
            <div className={styles.searchField}>
              <input
                type="search"
                placeholder="Search location, area, or pincode"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              {searching ? <p className={styles.helpText}>Searching locations...</p> : null}
              {searchResults.length > 0 ? (
                <div className={styles.searchResults}>
                  {searchResults.map((result) => (
                    <button
                      key={`${result.lat}-${result.lng}`}
                      type="button"
                      className={styles.resultButton}
                      onClick={() => {
                        void updatePosition(result.lat, result.lng);
                        setFullAddress(result.rawLabel);
                        setCity(result.city);
                        setPincode(result.pincode);
                        setStateName(String(result.state || ""));
                        setQuery(result.rawLabel);
                        setSearchResults([]);
                      }}
                    >
                      <strong>{result.label}</strong>
                      <span>{result.rawLabel}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <button type="button" className={styles.secondaryButton} onClick={handleUseCurrentLocation} disabled={loadingCurrent}>
              {loadingCurrent ? "Locating..." : "Use Current Location"}
            </button>
          </div>

          <iframe title="Selected map location" src={mapEmbedUrl} className={styles.mapFrame} loading="lazy" />
          <div className={styles.coordinates}>
            <span>Latitude: {lat}</span>
            <span>Longitude: {lng}</span>
          </div>
          <button type="button" className={styles.primaryButton} onClick={handleConfirmLocation}>
            Confirm Location
          </button>
        </div>

        {locationConfirmed ? (
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label>Current Address</label>
              <textarea value={fullAddress} onChange={(event) => setFullAddress(event.target.value)} rows={2} />
            </div>
            <div className={styles.field}>
              <label>Flat / House Number</label>
              <input value={houseNumber} onChange={(event) => setHouseNumber(event.target.value)} />
            </div>
            <div className={styles.field}>
              <label>Block / Area</label>
              <input value={locality} onChange={(event) => setLocality(event.target.value)} />
            </div>
            <div className={styles.field}>
              <label>Name</label>
              <input value={name} onChange={(event) => setName(event.target.value.replace(/[^a-zA-Z\s]/g, ""))} />
            </div>
            <div className={styles.field}>
              <label>Phone Number</label>
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))}
                inputMode="numeric"
              />
            </div>
            <div className={styles.field}>
              <label>Email</label>
              <input value={email} onChange={(event) => setEmail(event.target.value)} />
            </div>
            <div className={styles.field}>
              <label>Pincode</label>
              <input value={pincode} onChange={(event) => setPincode(event.target.value)} />
            </div>
            <div className={styles.field}>
              <label>City</label>
              <input value={city} onChange={(event) => setCity(event.target.value)} />
            </div>
            <div className={styles.field}>
              <label>State</label>
              <input value={stateName} onChange={(event) => setStateName(event.target.value)} />
            </div>
            <div className={styles.field}>
              <label>Save As</label>
              <div className={styles.chipRow}>
                {["Home", "Office", "Others"].map((label) => (
                  <button
                    key={label}
                    type="button"
                    className={`${styles.chip} ${saveAs === label ? styles.chipActive : ""}`}
                    onClick={() => setSaveAs(label)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <button type="button" className={styles.primaryButton} onClick={handleSubmit} disabled={isSaving}>
              {isSaving ? "Saving..." : mode === "add" ? "Add Address" : "Update Address"}
            </button>
          </div>
        ) : (
          <p className={styles.helpText}>Confirm map location to continue.</p>
        )}
      </article>
    </section>
  );
}
