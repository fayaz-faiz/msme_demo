import type { Location, LocationSuggestion } from "@/features/location/domain/location";

const GOOGLE_GEOCODE = "https://maps.googleapis.com/maps/api/geocode/json";

type GoogleAddressComponent = {
  long_name: string;
  short_name: string;
  types: string[];
};

type GoogleGeocodeResult = {
  formatted_address: string;
  address_components: GoogleAddressComponent[];
  postcode_localities?: string[];
  geometry?: {
    location?: {
      lat?: number;
      lng?: number;
    };
  };
};

function getGoogleApiKey(): string {
  const rawKey =
    process.env.NEXT_PUBLIC_GOOGE_API_KEY ??
    process.env.NEXT_PUBLIC_GOOGLE_API_KEY ??
    process.env.REACT_APP_GOOGLE_API_KEY ??
    "";

  // Protect against accidental wrapping quotes/spaces in .env values.
  return rawKey.trim().replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
}

function getAddressComponentValue(
  components: GoogleAddressComponent[],
  componentTypes: string[],
): string | undefined {
  const component = components.find((item) =>
    componentTypes.some((type) => item.types.includes(type)),
  );
  return component?.long_name;
}

function buildLocationLabel(city: string, pincode?: string, localityHint?: string): string {
  const base = pincode ? `${city}, ${pincode}` : city;
  return localityHint ? `${base} - ${localityHint}` : base;
}

function buildLocalityHint(localities?: string[]): string {
  if (!localities?.length) {
    return "";
  }
  return localities.slice(0, 2).join(", ");
}

function getBestPincodeFromResults(results: any): string | undefined {
  for (const result of results) {
    const pincode = getAddressComponentValue(result.address_components ?? [], ["postal_code"]);
    if (pincode) {
      return pincode;
    }
  }
  return undefined;
}

function buildLocationFromAddress(
  lat: number,
  lng: number,
  components: GoogleAddressComponent[],
  fallbackPincode?: string,
  localityHint?: string,
): Location {
  const city =
    getAddressComponentValue(components, [
      "locality",
      "administrative_area_level_2",
      "sublocality",
    ]) || "Current area";
  const state =
    getAddressComponentValue(components, [
      "administrative_area_level_1",
      "administrative_area_level_2",
    ]) || "";
  const pincode = getAddressComponentValue(components, ["postal_code"]) || fallbackPincode || "";

  return {
    city,
    state,
    pincode,
    label: buildLocationLabel(city, pincode, localityHint),
    lat,
    lng,
  };
}

export async function reverseGeocode(lat: number, lng: number): Promise<Location | null> {
  const apiKey = getGoogleApiKey();
  if (!apiKey) {
    return null;
  }

  const url = new URL(GOOGLE_GEOCODE);
  url.searchParams.set("latlng", `${lat},${lng}`);
  url.searchParams.set("key", apiKey);

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as {
    results?: GoogleGeocodeResult[];
    status?: string;
    error_message?: string;
  };

  if (data.status !== "OK" || !data.results?.length) {
    if (data.status === "REQUEST_DENIED") {
      console.error("Google reverse geocoding denied:", data.error_message ?? "Unknown error");
    }
    return null;
  }

  const first = data.results[0];
  const bestPincode = getBestPincodeFromResults(data.results);
  const localityHint = buildLocalityHint(first.postcode_localities);
  return buildLocationFromAddress(lat, lng, first.address_components ?? [], bestPincode, localityHint);
}

export async function searchLocations(query: string): Promise<LocationSuggestion[]> {
  const apiKey = getGoogleApiKey();
  if (!apiKey) {
    return [];
  }

  const url = new URL(GOOGLE_GEOCODE);
  url.searchParams.set("address", query);
  url.searchParams.set("key", apiKey);

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    return [];
  }

  const data = (await response.json()) as {
    results?: GoogleGeocodeResult[];
    status?: string;
    error_message?: string;
  };

  if (data.status !== "OK" || !data.results?.length) {
    if (data.status === "REQUEST_DENIED") {
      console.error("Google search geocoding denied:", data.error_message ?? "Unknown error");
    }
    return [];
  }

  return data.results.slice(0, 6).map((entry) => {
    const components = entry.address_components ?? [];
    const city =
      getAddressComponentValue(components, [
        "locality",
        "administrative_area_level_2",
        "sublocality",
      ]) || "City";
    const state =
      getAddressComponentValue(components, [
        "administrative_area_level_1",
        "administrative_area_level_2",
      ]) || "";
    const pincode =
      getAddressComponentValue(components, ["postal_code"]) || getBestPincodeFromResults(data.results) || "";
    const lat = entry.geometry?.location?.lat;
    const lng = entry.geometry?.location?.lng;
    const localityHint = buildLocalityHint(entry.postcode_localities);

    return {
      city,
      state,
      pincode,
      label: buildLocationLabel(city, pincode, localityHint),
      lat: typeof lat === "number" ? lat : 0,
      lng: typeof lng === "number" ? lng : 0,
      rawLabel: localityHint ? `${entry.formatted_address} - ${localityHint}` : entry.formatted_address,
    };
  }).filter((entry) => entry.lat !== 0 || entry.lng !== 0);
}
