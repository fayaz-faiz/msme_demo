import type { Location, LocationSuggestion } from "@/features/location/domain/location";

const NOMINATIM_SEARCH = "https://nominatim.openstreetmap.org/search";
const NOMINATIM_REVERSE = "https://nominatim.openstreetmap.org/reverse";

function buildLocationFromAddress(
  lat: number,
  lng: number,
  address: Record<string, string | undefined>,
): Location {
  const city = address.city || address.town || address.village || address.county || "Current area";
  const state = address.state || address.state_district || "";
  const pincode = address.postcode || "000000";

  return {
    city,
    state,
    pincode,
    label: `${city}, ${pincode}`,
    lat,
    lng,
  };
}

export async function reverseGeocode(lat: number, lng: number): Promise<Location | null> {
  const url = new URL(NOMINATIM_REVERSE);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("addressdetails", "1");

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as {
    display_name?: string;
    address?: Record<string, string | undefined>;
    lat?: string;
    lon?: string;
  };

  if (!data.address || !data.lat || !data.lon) {
    return null;
  }

  return buildLocationFromAddress(Number(data.lat), Number(data.lon), data.address);
}

export async function searchLocations(query: string): Promise<LocationSuggestion[]> {
  const url = new URL(NOMINATIM_SEARCH);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "6");
  url.searchParams.set("q", query);

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    return [];
  }

  const data = (await response.json()) as Array<{
    display_name: string;
    address?: Record<string, string | undefined>;
    lat: string;
    lon: string;
  }>;

  return data.map((entry) => {
    const address = entry.address ?? {};
    const city = address.city || address.town || address.village || address.county || "City";
    const state = address.state || address.state_district || "";
    const pincode = address.postcode || "000000";

    return {
      city,
      state,
      pincode,
      label: `${city}, ${pincode}`,
      lat: Number(entry.lat),
      lng: Number(entry.lon),
      rawLabel: entry.display_name,
    };
  });
}
