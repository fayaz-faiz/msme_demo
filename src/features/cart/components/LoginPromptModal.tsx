"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import styles from "./LoginPromptModal.module.css";

type Props = {
  open: boolean;
  onClose: () => void;
  onLogin: () => void;
};

export function LoginPromptModal({ open, onClose, onLogin }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-prompt-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.card}>
        <div className={styles.iconWrap}>
          <svg
            width="30"
            height="30"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="12" cy="8" r="3.5" fill="#1f9966" />
            <path
              d="M4 20c0-3.87 3.58-7 8-7s8 3.13 8 7"
              stroke="#1f9966"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <h2 id="login-prompt-title" className={styles.title}>
          Log in to continue
        </h2>
        <p className={styles.description}>
          Log in to add items to your cart and place orders seamlessly.
        </p>

        <button type="button" className={styles.btn} onClick={onLogin}>
          Log In
        </button>
        <button type="button" className={styles.dismiss} onClick={onClose}>
          Maybe later
        </button>
      </div>
    </div>,
    document.body,
  );
}
