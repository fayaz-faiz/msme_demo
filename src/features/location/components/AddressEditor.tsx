"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Autocomplete, GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import type { Libraries } from "@react-google-maps/api";
import { getAddressWeb, postAddAddress, updateAddress } from "@/api";
import { useAppDispatch } from "@/features/cart/store/hooks";
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

const MAP_LIBRARIES: Libraries = ["places"];
const MAP_CONTAINER_STYLE = { width: "100%", height: "320px", borderRadius: "12px" };
const DEFAULT_MAP_CENTER: google.maps.LatLngLiteral = { lat: 20.5937, lng: 78.9629 };

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

function extractFromComponents(components: google.maps.GeocoderAddressComponent[]) {
  const find = (types: string[]) =>
    components.find((c) => types.some((t) => c.types.includes(t)))?.long_name || "";
  return {
    city: find(["locality", "administrative_area_level_2", "sublocality"]),
    state: find(["administrative_area_level_1"]),
    pincode: find(["postal_code"]),
  };
}

function getBestPincode(results: google.maps.GeocoderResult[]): string {
  for (const result of results) {
    const pin = result.address_components.find((c) => c.types.includes("postal_code"))?.long_name;
    if (pin) return pin;
  }
  return "";
}

export function AddressEditor({ mode, addressId }: AddressEditorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const { location, resolveCurrentLocation, setLocation } = useLocation();
  const requestedNextPath = String(searchParams?.get("next") || "").trim();
  const nextPath =
    requestedNextPath.startsWith("/") && !requestedNextPath.startsWith("//")
      ? requestedNextPath
      : "/";

  const { isLoaded, loadError } = useJsApiLoader({
    id: "location-picker-places",
    googleMapsApiKey:
      process.env.NEXT_PUBLIC_GOOGE_API_KEY ||
      process.env.NEXT_PUBLIC_GOOGLE_API_KEY ||
      process.env.REACT_APP_GOOGLE_API_KEY ||
      "",
    libraries: MAP_LIBRARIES,
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [loadingCurrent, setLoadingCurrent] = useState(false);
  const [loadingAddress, setLoadingAddress] = useState(mode === "edit");

  const [lat, setLat] = useState(0);
  const [lng, setLng] = useState(0);
  const [mapCenter, setMapCenter] = useState<google.maps.LatLngLiteral>(DEFAULT_MAP_CENTER);
  const [mapZoom, setMapZoom] = useState(5);
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

  const geocodeAndApply = useCallback(
    (nextLat: number, nextLng: number) => {
      if (!isLoaded) return;
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ location: { lat: nextLat, lng: nextLng } }, (results, status) => {
        if (status !== "OK" || !results?.[0]) return;
        const { city: c, state: s } = extractFromComponents(results[0].address_components);
        const p = getBestPincode(results);
        const label = results[0].formatted_address;
        setFullAddress(label);
        setCity(c);
        setPincode(p);
        setStateName(s);
        setLocation({
          city: c || "City",
          state: s,
          pincode: p,
          label,
          lat: nextLat,
          lng: nextLng,
        });
      });
    },
    [isLoaded, setLocation],
  );

  const updatePosition = useCallback(
    (nextLat: number, nextLng: number) => {
      setLat(nextLat);
      setLng(nextLng);
      setMapCenter({ lat: nextLat, lng: nextLng });
      setMapZoom(15);
      dispatch(setselectedGps(formatGps(nextLat, nextLng)));
      geocodeAndApply(nextLat, nextLng);
    },
    [dispatch, geocodeAndApply],
  );

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
          if (coords.lat && coords.lng) {
            setMapCenter({ lat: coords.lat, lng: coords.lng });
            setMapZoom(15);
          }
          setFullAddress(
            [current.building, current.locality, current.city, current.state, current.area_code]
              .filter(Boolean)
              .join(", "),
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
        setMapCenter({ lat: location.lat, lng: location.lng });
        setMapZoom(15);
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

  const handleUseCurrentLocation = async () => {
    setLoadingCurrent(true);
    await resolveCurrentLocation();
    if (location) {
      updatePosition(location.lat, location.lng);
    }
    setLoadingCurrent(false);
  };

  const handlePlaceChanged = () => {
    if (!autocompleteRef.current) return;
    const place = autocompleteRef.current.getPlace();
    if (!place.geometry?.location) return;

    const newLat = place.geometry.location.lat();
    const newLng = place.geometry.location.lng();
    const components = place.address_components || [];
    const { city: c, state: s, pincode: p } = extractFromComponents(components);
    const label = place.formatted_address || "";

    setLat(newLat);
    setLng(newLng);
    setMapCenter({ lat: newLat, lng: newLng });
    setMapZoom(15);
    setFullAddress(label);
    setCity(c);
    setStateName(s);
    dispatch(setselectedGps(formatGps(newLat, newLng)));

    if (p) {
      setPincode(p);
      setLocation({ city: c || "City", state: s, pincode: p, label, lat: newLat, lng: newLng });
    } else {
      // Place details didn't include a postal code — geocode the coordinates to find one
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ location: { lat: newLat, lng: newLng } }, (results, status) => {
        const resolvedPin = status === "OK" && results ? getBestPincode(results) : "";
        setPincode(resolvedPin);
        setLocation({
          city: c || "City",
          state: s,
          pincode: resolvedPin,
          label,
          lat: newLat,
          lng: newLng,
        });
      });
    }
  };

  const handleMapClick = useCallback(
    (event: google.maps.MapMouseEvent) => {
      if (!event.latLng) return;
      updatePosition(event.latLng.lat(), event.latLng.lng());
    },
    [updatePosition],
  );

  const handleMarkerDragEnd = useCallback(
    (event: google.maps.MapMouseEvent) => {
      if (!event.latLng) return;
      updatePosition(event.latLng.lat(), event.latLng.lng());
    },
    [updatePosition],
  );

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
    if (!stateName.trim()) {
      notifyOrAlert("State is required.", "warning");
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
        const response = (await postAddAddress(payload)) as {
          data?: { status?: boolean; data?: { data?: unknown; message?: unknown } };
        };
        const success = response?.data?.status === true;
        if (!success) {
          notifyOrAlert("Unable to add address.", "error");
          return;
        }
        resolvedAddressId = String(response?.data?.data?.data || "");
        notifyOrAlert(
          String(response?.data?.data?.message || "Address Added successfully"),
          "success",
        );
      } else {
        const response = (await updateAddress(payload)) as {
          data?: { status?: boolean; data?: { message?: unknown } };
        };
        const success = response?.data?.status === true;
        if (!success) {
          notifyOrAlert("Unable to update address.", "error");
          return;
        }
        notifyOrAlert(
          String(response?.data?.data?.message || "Address updated successfully"),
          "success",
        );
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
      dispatch(
        setCurrentLoc({ city: city.trim(), pincode: pincode.trim(), latitude: lat, longitude: lng }),
      );
      setLocation({
        city: city.trim() || "City",
        state: stateName.trim(),
        pincode: pincode.trim(),
        label: [city.trim() || "City", pincode.trim()].filter(Boolean).join(", "),
        lat,
        lng,
      });
      router.push(nextPath);
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

  const markerPosition = lat && lng ? { lat, lng } : null;

  return (
    <section className={styles.page}>
      <article className={styles.card}>
        <div className={styles.header}>
          <div>
            <p className={styles.kicker}>Profile</p>
            <h1>{mode === "add" ? "Add New Address" : "Edit Address"}</h1>
          </div>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => router.push("/profile/my-addresses")}
          >
            Back
          </button>
        </div>

        {!locationConfirmed ? (
          <div className={styles.locationPanel}>
            <div className={styles.locationTools}>
              <div className={styles.searchField}>
                {isLoaded ? (
                  <Autocomplete
                    onLoad={(ref) => {
                      autocompleteRef.current = ref;
                    }}
                    onPlaceChanged={handlePlaceChanged}
                    options={{ componentRestrictions: { country: "in" } }}
                  >
                    <input type="search" placeholder="Search location, area, or pincode" />
                  </Autocomplete>
                ) : (
                  <input type="search" placeholder="Loading search..." disabled />
                )}
              </div>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={handleUseCurrentLocation}
                disabled={loadingCurrent}
              >
                {loadingCurrent ? "Locating..." : "Use Current Location"}
              </button>
            </div>

            <div className={styles.mapFrameWrap}>
              {loadError ? (
                <p className={styles.helpText}>Failed to load Google Maps. Check your API key.</p>
              ) : isLoaded ? (
                <GoogleMap
                  mapContainerStyle={MAP_CONTAINER_STYLE}
                  center={mapCenter}
                  zoom={mapZoom}
                  onClick={handleMapClick}
                  onLoad={(map) => {
                    mapRef.current = map;
                  }}
                  options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: false }}
                >
                  {markerPosition && (
                    <Marker
                      position={markerPosition}
                      draggable
                      onDragEnd={handleMarkerDragEnd}
                    />
                  )}
                </GoogleMap>
              ) : (
                <div className={styles.mapPlaceholder}>
                  <p>Loading map...</p>
                </div>
              )}
            </div>
            <p className={styles.helpText}>
              Search an address, click on the map, or drag the marker to set your location.
            </p>
            <div className={styles.coordinates}>
              <span>Latitude: {lat}</span>
              <span>Longitude: {lng}</span>
            </div>
            <button type="button" className={styles.primaryButton} onClick={handleConfirmLocation}>
              Confirm Location
            </button>
          </div>
        ) : (
          <div className={styles.currentCard}>
            <p className={styles.kicker}>Location Confirmed</p>
            <strong>{fullAddress || "Selected map location"}</strong>
            <span>
              {city} {pincode ? `- ${pincode}` : ""}
            </span>
          </div>
        )}

        {locationConfirmed ? (
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label>Current Address</label>
              <textarea value={fullAddress} rows={2} readOnly disabled />
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
              <input
                value={name}
                onChange={(event) => setName(event.target.value.replace(/[^a-zA-Z\s]/g, ""))}
              />
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
              <input value={pincode} readOnly disabled />
            </div>
            <div className={styles.field}>
              <label>City</label>
              <input value={city} readOnly disabled />
            </div>
            <div className={styles.field}>
              <label>State</label>
              <input value={stateName} readOnly disabled />
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
            <button
              type="button"
              className={styles.primaryButton}
              onClick={handleSubmit}
              disabled={isSaving}
            >
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
