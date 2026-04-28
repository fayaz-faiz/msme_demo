"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { postMyOrdersApiData } from "@/api";
import { formatCurrency } from "@/shared/lib/format-currency";
import { notifyOrAlert } from "@/shared/lib/notify";
import styles from "./page.module.css";

type OrderLike = Record<string, unknown>;
type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | undefined {
  if (typeof value === "object" && value !== null) {
    return value as UnknownRecord;
  }
  return undefined;
}

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
  const paymentDetails = asRecord(order?.payment_details);
  return String(paymentDetails?.status || order?.payment_status || "Pending");
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
  if (!(typeof raw === "string" || typeof raw === "number" || raw instanceof Date)) {
    return String(raw);
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return String(raw);
  }
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function pickAddress(order: OrderLike) {
  const billing = asRecord(order?.billings);
  const address = billing?.address || order?.shipping_address || order?.delivery_address || order?.address;
  if (!address) {
    return "-";
  }
  if (typeof address === "string") {
    return address;
  }
  const addressData = asRecord(address);
  if (!addressData) {
    return "-";
  }
  const parts = [addressData.building, addressData.locality, addressData.city, addressData.state, addressData.area_code || addressData.pincode].filter(Boolean);
  return parts.join(", ");
}

function formatPaymentLabel(status: string) {
  return status.replace(/-/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function getStatusVariant(status: string): "placed" | "delivered" | "cancelled" | "default" {
  const s = status.toLowerCase();
  if (s.includes("deliver") || s.includes("complet")) return "delivered";
  if (s.includes("cancel")) return "cancelled";
  if (s.includes("place") || s.includes("process") || s.includes("accept") || s.includes("dispatch") || s.includes("pending")) return "placed";
  return "default";
}

function getPaymentVariant(status: string): "paid" | "pending" | "default" {
  const s = status.toLowerCase();
  if (s === "paid" || s === "success" || s === "completed") return "paid";
  if (s === "pending" || s === "unpaid") return "pending";
  return "default";
}

function SkeletonCard() {
  return (
    <div className={styles.skeletonCard}>
      <div className={styles.skeletonAccent} />
      <div className={styles.skeletonBody}>
        <div className={styles.skeletonRow}>
          <div className={styles.skeletonLine} style={{ height: 18, width: "38%" }} />
          <div className={styles.skeletonLine} style={{ height: 18, width: "22%" }} />
        </div>
        <div className={styles.skeletonLine} style={{ height: 13, width: "60%" }} />
        <div className={styles.skeletonLine} style={{ height: 1, width: "100%", opacity: 0.4 }} />
        <div className={styles.skeletonLine} style={{ height: 13, width: "80%" }} />
        <div className={styles.skeletonRow}>
          <div className={styles.skeletonLine} style={{ height: 26, width: "32%", borderRadius: 20 }} />
          <div className={styles.skeletonLine} style={{ height: 32, width: "26%", borderRadius: 20 }} />
        </div>
      </div>
    </div>
  );
}

type OrderItem = { name: string; image: string; qty: number; unitText: string };

function normalizeOrderItems(order: OrderLike): OrderItem[] {
  const rawItems = Array.isArray(order?.items) ? order.items : [];
  return rawItems.map((raw, index) => {
    const item = asRecord(raw) || {};
    const qty = Number(item.count ?? item.quantity ?? 1);
    return {
      name: String(item.item_name || item.name || item.title || `Item ${index + 1}`),
      image: String(item.item_symbol || ""),
      qty: Number.isFinite(qty) && qty > 0 ? qty : 1,
      unitText: String(item.item_quantity || ""),
    };
  });
}

export default function AllOrdersPage() {
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [orders, setOrders] = useState<OrderLike[]>([]);
  const [page, setPage] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [copiedId, setCopiedId] = useState("");
  const pageSize = 10;

  const parseMyOrdersPayload = (response: unknown) => {
    const typed = response as {
      data?: {
        status?: boolean;
        data?: {
          message?: unknown[];
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
    const innerData = typed?.data?.data;

    // New API shape: { data: { data: { message: [...] } } }
    if (Array.isArray(innerData?.message)) {
      const rows = innerData.message;
      return { page: 1, pageSize: rows.length, totalOrders: rows.length, rows };
    }

    // Legacy paginated shape: { data: { data: { data: { page, total_orders, data: [...] } } } }
    const bucket = innerData?.data;
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
        const summary = normalized?.summary;
        if (summary && typeof summary === "object" && !Array.isArray(summary)) {
          return { ...normalized, ...(summary as OrderLike) } as OrderLike;
        }
        return normalized as OrderLike;
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

  const statusChipClass: Record<string, string> = {
    placed: styles.chipPlaced,
    delivered: styles.chipDelivered,
    cancelled: styles.chipCancelled,
    default: styles.chipDefault,
  };

  const accentClass: Record<string, string> = {
    placed: styles.accentPlaced,
    delivered: styles.accentDelivered,
    cancelled: styles.accentCancelled,
    default: styles.accentDefault,
  };

  const paymentChipClass: Record<string, string> = {
    paid: styles.paymentPaid,
    pending: styles.paymentPending,
    default: styles.paymentDefault,
  };

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Link href="/profile" className={styles.backBtn} aria-label="Back to profile">←</Link>
          <div>
            <p className={styles.headerTitle}>My Orders</p>
            <p className={styles.headerSubtitle}>Track &amp; review your purchases</p>
          </div>
        </div>
        {(totalOrders > 0 || orders.length > 0) && (
          <span className={styles.orderCountBadge}>{totalOrders || orders.length} orders</span>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className={styles.skeletonList}>
          {[1, 2, 3].map((n) => <SkeletonCard key={n} />)}
        </div>
      ) : error ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>⚠️</span>
          <p className={styles.emptyTitle}>Something went wrong</p>
          <p className={styles.emptySubtitle}>{error}</p>
          <button type="button" className={styles.retryBtn} onClick={() => void fetchOrders(1, false)}>
            Try again
          </button>
        </div>
      ) : orders.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>🛍️</span>
          <p className={styles.emptyTitle}>No orders yet</p>
          <p className={styles.emptySubtitle}>Your past orders will appear here once you place one.</p>
        </div>
      ) : (
        <>
          <div className={styles.orderList}>
            {orders.map((order, index) => {
              const orderId = pickOrderId(order);
              const amount = pickOrderTotal(order);
              const status = pickOrderStatus(order);
              const paymentStatus = pickPaymentStatus(order);
              const date = pickOrderDate(order);
              const address = pickAddress(order);
              const sv = getStatusVariant(status);
              const pv = getPaymentVariant(paymentStatus);
              const items = normalizeOrderItems(order);
              const visibleItems = items.slice(0, 2);
              const remainingItemsCount = Math.max(items.length - visibleItems.length, 0);
              const isCopied = copiedId === orderId;
              return (
                <article key={`${orderId}-${index}`} className={styles.orderCard}>
                  <div className={`${styles.cardAccent} ${accentClass[sv]}`} />
                  <div className={styles.cardBody}>
                    <div className={styles.cardTop}>
                      <div className={styles.cardTopLeft}>
                        <span className={`${styles.statusChip} ${statusChipClass[sv]}`}>
                          <span className={styles.statusDot} />
                          {status}
                        </span>
                        {orderId && (
                          <div className={styles.orderIdRow}>
                            <p className={styles.orderId}>#{orderId}</p>
                            <button
                              type="button"
                              className={`${styles.copyBtn} ${isCopied ? styles.copyBtnCopied : ""}`}
                              aria-label="Copy order ID"
                              onClick={() => {
                                void navigator.clipboard.writeText(orderId).then(() => {
                                  setCopiedId(orderId);
                                  setTimeout(() => setCopiedId(""), 2000);
                                });
                              }}
                            >
                              {isCopied ? (
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              ) : (
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                </svg>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                      <div className={styles.amountBlock}>
                        <span className={styles.amount}>{formatCurrency(amount)}</span>
                        <span className={`${styles.paymentChip} ${paymentChipClass[pv]}`}>
                          {formatPaymentLabel(paymentStatus)}
                        </span>
                      </div>
                    </div>

                    {items.length > 0 && (
                      <>
                        <hr className={styles.divider} />
                        <div className={styles.itemsStrip}>
                          {visibleItems.map((item, i) => (
                            <div key={i} className={styles.itemPill}>
                              {item.image ? (
                                <img src={item.image} alt={item.name} className={styles.itemThumb} />
                              ) : (
                                <div className={styles.itemThumbPlaceholder} aria-hidden="true" />
                              )}
                              <span className={styles.itemPillName}>
                                {item.name}{item.unitText ? ` · ${item.unitText}` : ""} × {item.qty}
                              </span>
                            </div>
                          ))}
                          {remainingItemsCount > 0 ? (
                            <span className={styles.moreItemsPill}>+{remainingItemsCount} more</span>
                          ) : null}
                        </div>
                      </>
                    )}

                    {address !== "-" && (
                      <>
                        <hr className={styles.divider} />
                        <div className={styles.addressRow}>
                          <span className={styles.addressIcon}>📍</span>
                          <span>{address}</span>
                        </div>
                      </>
                    )}

                    <div className={styles.cardBottom}>
                      <span className={styles.dateChip}>🕐 {date}</span>
                      {orderId && (
                        <Link href={`/orders/${orderId}`} className={styles.viewBtn}>
                          View details <span className={styles.viewArrow}>→</span>
                        </Link>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <div className={styles.loadMoreWrap}>
            {hasMore ? (
              <button
                type="button"
                className={styles.loadMoreBtn}
                onClick={() => void fetchOrders(page, true)}
                disabled={loadingMore}
              >
                {loadingMore ? "Loading…" : "Load more orders"}
              </button>
            ) : (
              <p className={styles.endText}>You&apos;ve seen all your orders</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}


