"use client";

import Link from "next/link";
import { useAppSelector } from "@/features/cart/store/hooks";
import { ORDER_STATUS_STEPS } from "@/features/orders/domain/order";
import { formatCurrency } from "@/shared/lib/format-currency";
import styles from "./page.module.css";

function getStatusLabel(status: string) {
  return ORDER_STATUS_STEPS.find((step) => step.status === status)?.label ?? "Order placed";
}

function formatPaymentLabel(status: string) {
  return status.replace(/-/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

export default function ProfilePage() {
  const user = useAppSelector((state) => state.auth.user);
  const orders = useAppSelector((state) => state.orders.items);

  if (!user) {
    return (
      <section className={styles.page}>
        <div className={styles.card}>
          <p className={styles.kicker}>Profile required</p>
          <h1>Sign in to see your profile</h1>
          <p>Log in first so we can show your account details and order history.</p>
          <Link href="/auth/login?next=/profile" className={styles.primaryButton}>
            Login Now
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.page}>
      <div className={styles.hero}>
        <div>
          <p className={styles.kicker}>Profile</p>
          <h1>{user.name}</h1>
          <p>Review your profile details and past orders in one place.</p>
        </div>
        <div className={styles.badgeRow}>
          <span>{orders.length} past orders</span>
          <span>{user.mobileNumber}</span>
        </div>
      </div>

      <div className={styles.grid}>
        <section className={styles.card}>
          <h2>Profile details</h2>
          <div className={styles.detailList}>
            <div>
              <span>Name</span>
              <strong>{user.name}</strong>
            </div>
            <div>
              <span>Mobile number</span>
              <strong>{user.mobileNumber}</strong>
            </div>
          </div>
          <Link href="/shops" className={styles.secondaryButton}>
            Continue Shopping
          </Link>
        </section>

        <section className={styles.card}>
          <h2>Past Orders</h2>
          {orders.length ? (
            <div className={styles.orderList}>
              {orders.map((order) => (
                <article key={order.id} className={styles.orderCard}>
                  <div className={styles.orderTop}>
                    <div>
                      <p className={styles.orderId}>Order {order.id}</p>
                      <h3>{getStatusLabel(order.status)}</h3>
                    </div>
                    <strong>{formatCurrency(order.subtotal)}</strong>
                  </div>
                  <p className={styles.orderMeta}>{order.deliveryAddress}</p>
                  <div className={styles.orderActions}>
                    <span>
                      {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(
                        new Date(order.createdAt),
                      )}
                    </span>
                    <span className={styles.paymentTag}>{formatPaymentLabel(order.paymentStatus)}</span>
                    <Link href={`/orders/${order.id}`} className={styles.trackButton}>
                      Track Order
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className={styles.emptyState}>No orders yet. Place your first order to see it here.</p>
          )}
        </section>
      </div>
    </section>
  );
}
