"use client";

import {
  createContext,
  useCallback,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Location } from "@/features/location/domain/location";
import { reverseGeocode } from "@/features/location/data/location-service";

const STORAGE_KEY = "msme-location";

type LocationContextValue = {
  location: Location | null;
  isResolving: boolean;
  error: string | null;
  setLocation: (location: Location) => void;
  resolveCurrentLocation: () => Promise<void>;
};

const LocationContext = createContext<LocationContextValue | null>(null);

type LocationProviderProps = {
  children: ReactNode;
};

export function LocationProvider({ children }: LocationProviderProps) {
  const [location, setLocationState] = useState<Location | null>(null);
  const [isResolving, setIsResolving] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const setLocation = useCallback((nextLocation: Location) => {
    setLocationState(nextLocation);
    setError(null);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextLocation));
  }, []);

  const resolveCurrentLocation = useCallback(async () => {
    setIsResolving(true);
    setError(null);

    if (!navigator.geolocation) {
      setError("Geolocation is not supported in this browser.");
      setIsResolving(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const resolved = await reverseGeocode(position.coords.latitude, position.coords.longitude);

        if (resolved) {
          setLocation(resolved);
        } else {
          setError("Unable to resolve your current address.");
        }

        setIsResolving(false);
      },
      () => {
        setError("Location access was denied. Search your address instead.");
        setIsResolving(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60_000,
      },
    );
  }, [setLocation]);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);

    if (saved) {
      try {
        setLocationState(JSON.parse(saved) as Location);
        setIsResolving(false);
        return;
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }

    void resolveCurrentLocation();
  }, [resolveCurrentLocation]);

  const value = useMemo<LocationContextValue>(
    () => ({
      location,
      isResolving,
      error,
      setLocation,
      resolveCurrentLocation,
    }),
    [error, isResolving, location, resolveCurrentLocation, setLocation],
  );

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useLocation() {
  const context = useContext(LocationContext);

  if (!context) {
    throw new Error("useLocation must be used within LocationProvider");
  }

  return context;
}
