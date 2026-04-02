"use client";

/* eslint-disable @next/next/no-img-element */

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { searchLocations } from "@/features/location/data/location-service";
import { LocationSuggestion } from "@/features/location/domain/location";
import { useLocation } from "@/features/location/context/location-context";
import styles from "./LocationPickerModal.module.css";

type LocationPickerModalProps = {
  open: boolean;
  onClose: () => void;
};

export function LocationPickerModal({ open, onClose }: LocationPickerModalProps) {
  const { location, error, isResolving, setLocation, resolveCurrentLocation } = useLocation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LocationSuggestion[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
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
    }
  }, [open]);

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
