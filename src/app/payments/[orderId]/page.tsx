"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/features/cart/store/hooks";
import { updateOrderPaymentStatus } from "@/features/orders/store/ordersSlice";
import { formatCurrency } from "@/shared/lib/format-currency";
import styles from "./page.module.css";

type PaymentView = "ready" | "processing" | "success" | "failed" | "cancelled";

function formatPaymentLabel(status: string) {
  return status.replace(/-/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

export default function PaymentPage() {
  const params = useParams<{ orderId: string }>();
  const orderId = Array.isArray(params.orderId) ? params.orderId[0] : params.orderId;
  const dispatch = useAppDispatch();
  const order = useAppSelector((state) => state.orders.items.find((item) => item.id === orderId));
  const [view, setView] = useState<PaymentView>("ready");
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const statusMessage = useMemo(() => {
    if (view === "success") {
      return "Payment successful. Your order is now confirmed.";
    }

    if (view === "failed") {
      return "Payment failed. Please retry or choose another payment attempt.";
    }

    if (view === "cancelled") {
      return "Payment was cancelled. You can try again whenever you are ready.";
    }

    if (view === "processing") {
      return "Redirecting through Razorpay checkout...";
    }

    return "Complete the payment to confirm your order.";
  }, [view]);

  function updatePaymentStatus(nextStatus: PaymentView) {
    if (!order) {
      return;
    }

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    dispatch(
      updateOrderPaymentStatus({
        orderId: order.id,
        paymentStatus:
          nextStatus === "success"
            ? "success"
            : nextStatus === "failed"
              ? "failed"
              : nextStatus === "cancelled"
                ? "cancelled"
                : "pending",
      }),
    );
    setView(nextStatus);
  }

  function handlePayNow() {
    if (!order) {
      return;
    }

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    setView("processing");
    timeoutRef.current = window.setTimeout(() => {
      updatePaymentStatus("success");
      timeoutRef.current = null;
    }, 1400);
  }

  if (!order) {
    return (
      <section className={styles.page}>
        <div className={styles.card}>
          <p className={styles.kicker}>Payment not found</p>
          <h1>We could not find that order.</h1>
          <p>The payment link may be outdated. Head back to your profile to view existing orders.</p>
          <Link href="/profile" className={styles.primaryButton}>
            Go to Profile
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.page}>
      <div className={styles.hero}>
        <div>
          <p className={styles.kicker}>Order placed successfully</p>
          <h1>Your order is ready for Razorpay payment</h1>
          <p>{statusMessage}</p>
        </div>
        <div className={styles.badgeRow}>
          <span>{formatCurrency(order.subtotal)}</span>
          <span>{formatPaymentLabel(order.paymentStatus)}</span>
        </div>
      </div>

      <div className={styles.grid}>
        <section className={`${styles.card} ${styles.successCard}`}>
          <div className={styles.successMark} aria-hidden="true">
            <span className={styles.successGlow} />
            <span className={styles.successCheck}>OK</span>
          </div>
          <h2>Order placed successfully</h2>
          <p>
            We created your order and moved you into the payment stage. You can confirm, retry, or cancel the Razorpay flow below.
          </p>
          <div className={styles.quickMeta}>
            <span>Order {order.id}</span>
            <span>{order.items.length} items</span>
          </div>
        </section>

        <section className={styles.card}>
          <h2>Razorpay Checkout</h2>
          <div className={styles.paymentStatusRow}>
            <span className={styles.statusPill}>{formatPaymentLabel(view)}</span>
            <span className={styles.amount}>{formatCurrency(order.subtotal)}</span>
          </div>

          <div className={styles.paymentBody}>
            <div className={styles.paymentNote}>
              <strong>Demo payment experience</strong>
              <p>Use the buttons below to simulate success, failure, or cancellation.</p>
            </div>

            <div className={styles.actions}>
              {view !== "success" ? (
                <>
                  <button
                    type="button"
                    className={styles.primaryButton}
                    onClick={handlePayNow}
                    disabled={view === "processing"}
                  >
                    {view === "processing" ? "Opening Razorpay..." : "Pay With Razorpay"}
                  </button>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => updatePaymentStatus("failed")}
                  >
                    Simulate Failure
                  </button>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => updatePaymentStatus("cancelled")}
                  >
                    Cancel Payment
                  </button>
                </>
              ) : (
                <>
                  <Link href={`/orders/${order.id}`} className={styles.primaryButton}>
                    Track Order
                  </Link>
                  <Link href="/profile" className={styles.secondaryButton}>
                    View Profile
                  </Link>
                </>
              )}
            </div>

            {view === "failed" || view === "cancelled" ? (
              <div className={styles.fallbackCard}>
                <p className={styles.fallbackTitle}>
                  {view === "failed" ? "Payment failed" : "Payment cancelled"}
                </p>
                <p>
                  {view === "failed"
                    ? "Please retry the payment or try another method."
                    : "You can retry the payment when you are ready."}
                </p>
                <div className={styles.actions}>
                  <button type="button" className={styles.primaryButton} onClick={handlePayNow}>
                    Retry Payment
                  </button>
                  <Link href="/profile" className={styles.secondaryButton}>
                    Back to Profile
                  </Link>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </section>
  );
}
