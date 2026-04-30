"use client";

import { useEffect, useState } from "react";
import styles from "./LocationPermissionModal.module.css";

type Stage = "initial" | "requesting" | "blocked";

type Props = {
  open: boolean;
  onClose: () => void;
  onGranted?: () => void;
};

export function LocationPermissionModal({ open, onClose, onGranted }: Props) {
  const [stage, setStage] = useState<Stage>("initial");

  useEffect(() => {
    if (open) setStage("initial");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleRequestPermission = () => {
    if (!navigator.geolocation) {
      setStage("blocked");
      return;
    }

    setStage("requesting");

    navigator.geolocation.getCurrentPosition(
      () => {
        onGranted?.();
        onClose();
      },
      (err) => {
        // err.code === 1 is PERMISSION_DENIED — works on all browsers incl. iOS Safari
        if (err.code === 1) {
          setStage("blocked");
        } else {
          // POSITION_UNAVAILABLE (2) or TIMEOUT (3) — let user try again
          setStage("initial");
        }
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="loc-perm-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.card}>
        <div className={styles.iconWrap}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"
              fill={stage === "blocked" ? "#ef4444" : "#fc8019"}
            />
          </svg>
        </div>

        <h2 id="loc-perm-title" className={styles.title}>
          {stage === "blocked" ? "Location Access Blocked" : "Enable Location Access"}
        </h2>

        <p className={styles.description}>
          {stage === "blocked" ? (
            <>
              Location is blocked in your browser. To enable it, tap the{" "}
              <strong>lock / info icon</strong> in the address bar, set{" "}
              <strong>Location</strong> to <strong>Allow</strong>, then tap{" "}
              <strong>Try Again</strong> below.
            </>
          ) : (
            "We need your location to show nearby shops and deliver to the right address. Tap the button below and allow access when your browser asks."
          )}
        </p>

        {stage === "blocked" ? (
          <button
            type="button"
            className={styles.btn}
            onClick={() => setStage("initial")}
          >
            Try Again
          </button>
        ) : (
          <button
            type="button"
            className={styles.btn}
            onClick={handleRequestPermission}
            disabled={stage === "requesting"}
          >
            {stage !== "requesting" && (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"
                  fill="#fff"
                />
              </svg>
            )}
            {stage === "requesting" ? "Waiting for permission…" : "Provide Location Permission"}
          </button>
        )}

        <button type="button" className={styles.dismiss} onClick={onClose}>
          Not now
        </button>
      </div>
    </div>
  );
}
