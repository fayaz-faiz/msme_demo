"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { postMyOrdersApiData } from "@/api";
import { formatCurrency } from "@/shared/lib/format-currency";
import { notifyOrAlert } from "@/shared/lib/notify";
import styles from "./page.module.css";

type OrderLike = Record<string, unknown>;

function toReadableMessage(value: unknown): string {
  if (!value) {
    return "";
  }
  if (typeof value === "string") {
    return value.trim();
  }
  if (Array.isArray(value)) {
    return value.map((entry) => toReadableMessage(entry)).filter(Boolean).join(" ").trim();
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return (
      toReadableMessage(obj.message) ||
      toReadableMessage(obj.error) ||
      toReadableMessage(obj.reason) ||
      toReadableMessage(obj.detail) ||
      ""
    );
  }
  return "";
}

function getErrorMessage(value: unknown, fallback = "Unable to load orders.") {
  const typed = value as {
    response?: { data?: { message?: unknown; data?: { message?: unknown } } };
    message?: unknown;
    data?: { message?: unknown; data?: { message?: unknown } };
  };
  const raw =
    typed?.response?.data?.message ||
    typed?.response?.data?.data?.message ||
    typed?.message ||
    typed?.data?.message ||
    typed?.data?.data?.message;
  return toReadableMessage(raw) || fallback;
}

function pickOrderId(order: OrderLike) {
  return String(order?._id || order?.id || order?.order_id || order?.orderId || "").trim();
}

function pickOrderStatus(order: OrderLike) {
  return String(order?.state || order?.status || "Placed");
}

function pickPaymentStatus(order: OrderLike) {
  return String(order?.payment_details?.status || order?.payment_status || "Pending");
}

function pickOrderTotal(order: OrderLike) {
  const raw = order?.grand_total ?? order?.total_amount ?? order?.order_value ?? order?.amount ?? 0;
  const amount = Number(raw);
  return Number.isFinite(amount) ? amount : 0;
}

function pickOrderDate(order: OrderLike) {
  const raw = order?.order_placed_timestamp || order?.created_at || order?.createdAt;
  if (!raw) {
    return "-";
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return String(raw);
  }
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function pickAddress(order: OrderLike) {
  const address = order?.billings?.address || order?.shipping_address || order?.delivery_address || order?.address;
  if (!address) {
    return "-";
  }
  if (typeof address === "string") {
    return address;
  }
  const parts = [address?.building, address?.locality, address?.city, address?.state, address?.area_code || address?.pincode].filter(Boolean);
  return parts.join(", ");
}

function formatPaymentLabel(status: string) {
  return status.replace(/-/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

export default function AllOrdersPage() {
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [orders, setOrders] = useState<OrderLike[]>([]);
  const [page, setPage] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const pageSize = 10;

  const parseMyOrdersPayload = (response: unknown) => {
    const typed = response as {
      data?: {
        status?: boolean;
        data?: {
          data?: {
            page?: number;
            pageSize?: number;
            total_orders?: number;
            total_page?: number;
            data?: unknown[];
          };
        };
      };
    };
    const bucket = typed?.data?.data?.data;
    const pageValue = Number(bucket?.page ?? 1);
    const pageSizeValue = Number(bucket?.pageSize ?? pageSize);
    const total = Number(bucket?.total_orders ?? 0);
    const rows = Array.isArray(bucket?.data) ? bucket.data : [];
    return {
      page: Number.isFinite(pageValue) ? pageValue : 1,
      pageSize: Number.isFinite(pageSizeValue) ? pageSizeValue : pageSize,
      totalOrders: Number.isFinite(total) ? total : 0,
      rows,
    };
  };

  const normalizePagedRows = (rows: unknown[]): OrderLike[] => {
    return rows
      .map((entry) => {
        const normalized = entry as Record<string, unknown>;
        return (normalized?.summary as OrderLike) || (normalized as OrderLike);
      })
      .filter(Boolean);
  };

  const fetchOrders = useCallback(async (targetPage: number, append: boolean) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setError("");
    }
    try {
      const response = await postMyOrdersApiData({ page: targetPage, pageSize });
      const parsed = parseMyOrdersPayload(response);
      const incoming = normalizePagedRows(parsed.rows);
      setOrders((previous) => (append ? [...previous, ...incoming] : incoming));
      setTotalOrders(parsed.totalOrders);
      setPage(parsed.page + 1);
    } catch (err: unknown) {
      const message = getErrorMessage(err);
      setError(message);
      notifyOrAlert(message, "error");
      if (!append) {
        setOrders([]);
      }
    } finally {
      if (append) {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void fetchOrders(1, false);
  }, [fetchOrders]);

  const hasMore = useMemo(() => orders.length < totalOrders, [orders.length, totalOrders]);

  return (
    <section className={styles.page}>
      <div className={styles.hero}>
        <div>
          <p className={styles.kicker}>Orders</p>
          <h1>All past orders</h1>
          <p>Review every order and quickly jump to tracking details.</p>
        </div>
        <div className={styles.badgeRow}>
          <span>{totalOrders || orders.length} orders</span>
          <Link href="/profile" className={`${styles.secondaryButton} ${styles.backProfileLink}`}>
            <span className={styles.backIcon} aria-hidden="true">←</span>
            <span>Back to Profile</span>
          </Link>
        </div>
      </div>

      <section className={styles.card}>
        {loading ? (
          <p className={styles.emptyState}>Loading orders...</p>
        ) : error ? (
          <div className={styles.errorWrap}>
            <p className={styles.emptyState}>{error}</p>
            <button type="button" className={styles.primaryButton} onClick={() => void fetchOrders(1, false)}>
              Retry
            </button>
          </div>
        ) : orders.length === 0 ? (
          <p className={styles.emptyState}>No past orders found yet.</p>
        ) : (
          <div className={styles.orderList}>
            {orders.map((order, index) => {
              const orderId = pickOrderId(order);
              const amount = pickOrderTotal(order);
              const status = pickOrderStatus(order);
              const paymentStatus = pickPaymentStatus(order);
              const date = pickOrderDate(order);
              const address = pickAddress(order);
              return (
                <article key={`${orderId}-${index}`} className={styles.orderCard}>
                  <div className={styles.orderTop}>
                    <div>
                      <p className={styles.orderId}>Order {orderId || "-"}</p>
                      <h3>{status}</h3>
                    </div>
                    <div className={styles.amountWrap}>
                      <strong>{formatCurrency(amount)}</strong>
                      <span className={`${styles.paymentTag} ${paymentStatus.toLowerCase() === "paid" ? styles.paymentTagPaid : ""}`}>
                        {formatPaymentLabel(paymentStatus)}
                      </span>
                    </div>
                  </div>
                  <p className={styles.orderMeta}>{address}</p>
                  <div className={styles.orderActions}>
                    <span>{date}</span>
                    <div className={styles.actionRight}>
                      {orderId ? (
                        <Link href={`/orders/${orderId}`} className={styles.primaryButton}>
                          Track order
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        {!loading && !error && orders.length > 0 ? (
          <div className={styles.loadMoreWrap}>
            {hasMore ? (
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => void fetchOrders(page, true)}
                disabled={loadingMore}
              >
                {loadingMore ? "Loading..." : "Load more orders"}
              </button>
            ) : (
              <p className={styles.endText}>You have reached the end of your order history.</p>
            )}
          </div>
        ) : null}
      </section>
    </section>
  );
}
