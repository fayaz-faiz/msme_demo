"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { useAppSelector } from "@/features/cart/store/hooks";
import { OrderTimeline } from "@/features/orders/components/OrderTimeline";
import { ORDER_STATUS_STEPS } from "@/features/orders/domain/order";
import { formatCurrency } from "@/shared/lib/format-currency";
import styles from "./page.module.css";

function getStatusLabel(status: string) {
  return ORDER_STATUS_STEPS.find((step) => step.status === status)?.label ?? "Order placed";
}

function formatPaymentLabel(status: string) {
  return status.replace(/-/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

export default function OrderTrackingPage() {
  const params = useParams<{ orderId: string }>();
  const orderId = Array.isArray(params.orderId) ? params.orderId[0] : params.orderId;
  const order = useAppSelector((state) => state.orders.items.find((item) => item.id === orderId));

  const placedAt = useMemo(() => {
    if (!order) {
      return null;
    }

    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(order.createdAt));
  }, [order]);

  if (!order) {
    return (
      <section className={styles.page}>
        <div className={styles.card}>
          <p className={styles.kicker}>Order not found</p>
          <h1>We could not find that order.</h1>
          <p>It may have been cleared from storage or the link may be outdated.</p>
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
          <p className={styles.kicker}>Order tracking</p>
          <h1>Track order {order.id}</h1>
          <p>Placed by {order.customerName}. Use this page to follow every delivery milestone.</p>
        </div>
        <div className={styles.badgeRow}>
          <span>{getStatusLabel(order.status)}</span>
          <span>{formatCurrency(order.subtotal)}</span>
        </div>
      </div>

      <div className={styles.grid}>
        <section className={styles.card}>
          <h2>Status timeline</h2>
          <OrderTimeline currentStatus={order.status} />
        </section>

        <section className={styles.card}>
          <h2>Order details</h2>
          <div className={styles.detailList}>
            <div>
              <span>Placed at</span>
              <strong>{placedAt}</strong>
            </div>
            <div>
              <span>Payment status</span>
              <strong>{formatPaymentLabel(order.paymentStatus)}</strong>
            </div>
            <div>
              <span>Delivery address</span>
              <strong>{order.deliveryAddress}</strong>
            </div>
            <div>
              <span>Mobile number</span>
              <strong>{order.mobileNumber}</strong>
            </div>
          </div>

          <div className={styles.summaryList}>
            {order.items.map((item) => (
              <div key={item.productId} className={styles.summaryRow}>
                <span>
                  {item.name} x {item.quantity}
                </span>
                <strong>{formatCurrency(item.price * item.quantity)}</strong>
              </div>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
