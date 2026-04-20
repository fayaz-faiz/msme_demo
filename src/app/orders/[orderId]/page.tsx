"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getCancelReasons, orderCancelOrder, postOrderDertailsById, postTrackOrder } from "@/api";
import { formatCurrency } from "@/shared/lib/format-currency";
import { notifyOrAlert } from "@/shared/lib/notify";
import styles from "./page.module.css";

type UnknownRecord = Record<string, unknown>;
type OrderItemLike = {
  name: string;
  quantity: number;
  lineTotal: number;
  image: string;
  unitText: string;
};
type ChargeLike = {
  title: string;
  amount: number;
};

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
  const obj = asRecord(value);
  if (!obj) {
    return "";
  }
  return (
    toReadableMessage(obj.message) ||
    toReadableMessage(obj.error) ||
    toReadableMessage(obj.reason) ||
    toReadableMessage(obj.detail) ||
    ""
  );
}

function getErrorMessage(value: unknown, fallback = "Unable to load order details.") {
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

function formatDateTime(value: unknown) {
  if (!value) {
    return "-";
  }
  const text = String(value);
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) {
    return text;
  }
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatLabel(status: string) {
  return status
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function normalizeOrderDetailsPayload(response: unknown): UnknownRecord | null {
  const typed = response as {
    data?: {
      status?: boolean;
      data?: unknown;
      message?: unknown;
    };
  };

  if (!typed?.data?.status) {
    return null;
  }

  const payload = typed?.data?.data;

  if (Array.isArray(payload) && payload[0]) {
    const first = asRecord(payload[0]);
    if (!first) return null;
    return asRecord(first.summary) || first;
  }

  const payloadRecord = asRecord(payload);
  if (payloadRecord) {
    // New API shape: { request_id, apiType, message: [{ _id, summary, ... }] }
    if (Array.isArray(payloadRecord.message) && payloadRecord.message.length > 0) {
      const first = asRecord(payloadRecord.message[0] as unknown);
      if (first) return asRecord(first.summary) || first;
    }
    return asRecord(payloadRecord.summary) || payloadRecord;
  }

  return null;
}

function pickAddressText(address: unknown) {
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
  const parts = [
    addressData.building,
    addressData.locality,
    addressData.city,
    addressData.state,
    addressData.country,
    addressData.area_code || addressData.pincode,
  ].filter(Boolean);
  return parts.join(", ");
}

function normalizeItems(summary: UnknownRecord | null): OrderItemLike[] {
  const rawItems = Array.isArray(summary?.items) ? summary.items : [];
  return rawItems.map((rawItem, index) => {
    const item = asRecord(rawItem) || {};
    const quantity = Number(item.count ?? item.quantity ?? 1);
    const lineTotal = Number(item.total_amount ?? item.amount ?? 0);
    const safeQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
    const safeLineTotal = Number.isFinite(lineTotal) ? lineTotal : 0;
    return {
      name: String(item.item_name || item.name || item.title || `Item ${index + 1}`),
      quantity: safeQuantity,
      lineTotal: safeLineTotal,
      image: String(item.item_symbol || ""),
      unitText: String(item.item_quantity || ""),
    };
  });
}

function normalizeCharges(summary: UnknownRecord | null): ChargeLike[] {
  const rawCharges = Array.isArray(summary?.other_charges) ? summary.other_charges : [];
  return rawCharges.map((charge) => {
    const entry = asRecord(charge) || {};
    const priceObj = asRecord(entry.price);
    const amount = Number(entry.amount ?? priceObj?.value ?? 0);
    return {
      title: String(entry.title || "Charge"),
      amount: Number.isFinite(amount) ? amount : 0,
    };
  });
}

function buildTimeline(summary: UnknownRecord | null) {
  const status = String(summary?.status || "Pending");
  const steps = [
    { key: "placed", label: "Order placed", time: formatDateTime(summary?.order_placed_timestamp) },
    { key: "packed", label: "Packed", time: formatDateTime(summary?.order_packed_timestamp) },
    { key: "out", label: "Out for delivery", time: formatDateTime(summary?.order_out_for_delivery_timestamp) },
    { key: "delivered", label: "Order delivered", time: formatDateTime(summary?.order_delivered_timestamp) },
  ];

  const statusMap: Record<string, number> = {
    Pending: 0,
    Packed: 1,
    "Out-for-delivery": 2,
    "Order-delivered": 3,
    Cancelled: 1,
    Failed: 1,
  };
  const active = statusMap[status] ?? 0;

  return steps.map((step, index) => {
    const state = index < active ? "done" : index === active ? "active" : "upcoming";
    return { ...step, state };
  });
}

export default function OrderDetailsPage() {
  const params = useParams<{ orderId: string }>();
  const orderId = Array.isArray(params.orderId) ? params.orderId[0] : params.orderId;
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<UnknownRecord | null>(null);

  const fetchOrderDetails = useCallback(async () => {
    if (!orderId) {
      setError("Order ID is missing.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await postOrderDertailsById({ order_id: orderId });
      const normalized = normalizeOrderDetailsPayload(response);
      if (!normalized) {
        const message = getErrorMessage(response, "Order details not found.");
        setError(message);
        notifyOrAlert(message, "warning");
        setSummary(null);
        return;
      }
      setSummary(normalized);
    } catch (err: unknown) {
      const message = getErrorMessage(err);
      setError(message);
      notifyOrAlert(message, "error");
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void fetchOrderDetails();
  }, [fetchOrderDetails]);

  const normalizedOrderId = useMemo(
    () => String(summary?._id || summary?.order_id || summary?.id || orderId || "-"),
    [summary, orderId],
  );
  const status = useMemo(() => String(summary?.status || "Pending"), [summary]);
  const statusLabel = useMemo(() => formatLabel(status), [status]);
  const paymentStatus = useMemo(() => formatLabel(String(asRecord(summary?.payment_details)?.status || status)), [summary, status]);
  const totalAmount = useMemo(() => {
    const value = Number(summary?.total_amount ?? summary?.grand_total ?? summary?.amount ?? 0);
    return Number.isFinite(value) ? value : 0;
  }, [summary]);
  const placedAt = useMemo(() => formatDateTime(summary?.order_placed_timestamp), [summary]);
  const providerName = useMemo(() => String(summary?.provider_name || "-"), [summary]);
  const providerAddress = useMemo(() => pickAddressText(summary?.provider_address), [summary]);
  const billing = useMemo(() => asRecord(summary?.billings), [summary]);
  const billingAddress = useMemo(() => pickAddressText(billing?.address), [billing]);
  const paymentDetails = useMemo(() => asRecord(summary?.payment_details), [summary]);
  const paymentParams = useMemo(() => asRecord(paymentDetails?.params), [paymentDetails]);
  const items = useMemo(() => normalizeItems(summary), [summary]);
  const charges = useMemo(() => normalizeCharges(summary), [summary]);
  const timeline = useMemo(() => buildTimeline(summary), [summary]);
  const canTrack = useMemo(() => {
    const disallowed = ["Order-delivered", "Cancelled", "Failed", "Return_Initiated", "Return_Approved", "Return_Picked", "Return_Delivered"];
    return !disallowed.includes(status);
  }, [status]);
  const canCancel = useMemo(() => {
    const allowedStatuses = ["Pending", "Packed"];
    if (!allowedStatuses.includes(status)) {
      return false;
    }
    const rawItems = Array.isArray(summary?.items) ? summary.items : [];
    return !rawItems.some((rawItem) => asRecord(rawItem)?.item_cancellable_status === false);
  }, [summary, status]);

  const extractFirstCancelReasonId = (response: unknown): string => {
    const typed = response as {
      data?: {
        data?: unknown;
        message?: unknown;
      };
      message?: unknown;
    };
    const buckets = [typed?.data?.data, typed?.data?.message, typed?.message];
    for (const bucket of buckets) {
      if (!Array.isArray(bucket)) {
        continue;
      }
      for (const entry of bucket) {
        const row = asRecord(entry);
        const id = String(row?._id || row?.reason_id || row?.id || "").trim();
        if (id) {
          return id;
        }
      }
    }
    return "";
  };

  const handleTrackOrder = async () => {
    setActionLoading(true);
    try {
      const response = await postTrackOrder({ order_id: normalizedOrderId });
      const typed = response as {
        data?: {
          status?: boolean;
          data?: {
            response?: {
              url?: string;
            };
            message?: unknown;
          };
          message?: unknown;
        };
      };
      if (!typed?.data?.status) {
        notifyOrAlert(toReadableMessage(typed?.data?.data?.message || typed?.data?.message) || "Unable to track order.", "warning");
        return;
      }
      const url = String(typed?.data?.data?.response?.url || "").trim();
      if (!url) {
        notifyOrAlert("Tracking URL is not available yet.", "warning");
        return;
      }
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err: unknown) {
      notifyOrAlert(getErrorMessage(err, "Unable to track order."), "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    const confirmed = window.confirm("Do you want to cancel this order?");
    if (!confirmed) {
      return;
    }

    setActionLoading(true);
    try {
      const reasonsResponse = await getCancelReasons();
      const cancelReasonId = extractFirstCancelReasonId(reasonsResponse);
      if (!cancelReasonId) {
        notifyOrAlert("Cancellation reason is unavailable right now.", "warning");
        return;
      }

      const response = await orderCancelOrder({
        order_id: normalizedOrderId,
        cancellation_reason_id: cancelReasonId,
      });
      const typed = response as {
        data?: {
          status?: boolean;
          data?: { message?: unknown };
          message?: unknown;
        };
      };
      if (!typed?.data?.status) {
        notifyOrAlert(toReadableMessage(typed?.data?.data?.message || typed?.data?.message) || "Unable to cancel order.", "warning");
        return;
      }
      notifyOrAlert(toReadableMessage(typed?.data?.data?.message) || "Order cancelled successfully.", "success");
      await fetchOrderDetails();
    } catch (err: unknown) {
      notifyOrAlert(getErrorMessage(err, "Unable to cancel order."), "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadInvoice = () => {
    const invoiceLines = [
      `Invoice`,
      `Order ID: ${normalizedOrderId}`,
      `Status: ${statusLabel}`,
      `Placed On: ${placedAt}`,
      `Provider: ${providerName}`,
      `Provider Address: ${providerAddress}`,
      `Billing Name: ${String(billing?.name || "-")}`,
      `Billing Address: ${billingAddress}`,
      `Payment Status: ${paymentStatus}`,
      ``,
      `Items:`,
      ...items.map((item) => `- ${item.name} x ${item.quantity} ${item.unitText ? `(${item.unitText})` : ""}: ${formatCurrency(item.lineTotal)}`),
      ``,
      `Charges:`,
      ...charges.map((charge) => `- ${charge.title}: ${formatCurrency(charge.amount)}`),
      ``,
      `Total: ${formatCurrency(totalAmount)}`,
    ];

    const blob = new Blob([invoiceLines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `invoice-${normalizedOrderId}.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <section className={styles.page}>
        <div className={styles.card}>
          <p className={styles.emptyState}>Loading order details...</p>
        </div>
      </section>
    );
  }

  if (error || !summary) {
    return (
      <section className={styles.page}>
        <div className={styles.card}>
          <p className={styles.kicker}>Order details</p>
          <h1>Unable to load this order.</h1>
          <p>{error || "Order details are not available right now."}</p>
          <div className={styles.actions}>
            <button type="button" className={styles.primaryButton} onClick={() => void fetchOrderDetails()}>
              Retry
            </button>
            <Link href="/orders/all" className={styles.secondaryButton}>
              Back to All Orders
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.page}>
      <div className={styles.hero}>
        <div>
          <p className={styles.kicker}>Order details</p>
          <h1>Order ID :  {normalizedOrderId}</h1>
          <p>Placed on {placedAt}. See full status, items, charges, and payment details below.</p>
        </div>
        <div className={styles.badgeRow}>
          <span>{statusLabel}</span>
          <span>{formatCurrency(totalAmount)}</span>
        </div>
      </div>

      <section className={styles.card}>
        <h2>Status timeline</h2>
        <ol className={styles.stepper}>
          {timeline.map((step, index) => (
            <li key={step.key} className={styles.stepItem}>
              <div className={styles.stepRail} aria-hidden="true">
                <span className={`${styles.stepNode} ${styles[`stepNode_${step.state}`]}`}>
                  {step.state === "done" ? "OK" : index + 1}
                </span>
                {index < timeline.length - 1 ? (
                  <span className={`${styles.stepConnector} ${styles[`stepConnector_${step.state}`]}`} />
                ) : null}
              </div>
              <div className={styles.stepBody}>
                <p className={styles.stepTitle}>{step.label}</p>
                <p className={styles.stepMeta}>
                  {step.time === "-" ? (step.state === "active" ? "In progress" : "Pending") : step.time}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <div className={styles.grid}>
        <section className={styles.card}>
          <h2>Provider details</h2>
          <div className={styles.detailList}>
            <div>
              <span>Name</span>
              <strong>{providerName}</strong>
            </div>
            <div>
              <span>Address</span>
              <strong>{providerAddress}</strong>
            </div>
          </div>
        </section>

        <section className={styles.card}>
          <h2>Payment details</h2>
          <div className={styles.detailList}>
            <div>
              <span>Type</span>
              <strong>{String(paymentDetails?.type || "-")}</strong>
            </div>
            <div>
              <span>Status</span>
              <strong>{paymentStatus}</strong>
            </div>
            <div>
              <span>Transaction ID</span>
              <strong>{String(paymentParams?.transaction_id || "-")}</strong>
            </div>
            <div>
              <span>Amount paid</span>
              <strong>
                {String(paymentParams?.currency || "INR")} {String(paymentParams?.amount || totalAmount)}
              </strong>
            </div>
            <div>
              <span>Payment method</span>
              <strong>{String(summary?.payment_method || "-")}</strong>
            </div>
          </div>
        </section>
      </div>

      <section className={styles.card}>
        <h2>Ordered items</h2>
        <div className={styles.summaryList}>
          {items.length > 0 ? (
            items.map((item, index) => (
              <div key={`${item.name}-${index}`} className={styles.summaryRow}>
                <div className={styles.itemLead}>
                  {item.image ? <img src={item.image} alt={item.name} /> : <div className={styles.itemPlaceholder} aria-hidden="true" />}
                  <span>
                    {item.name} x {item.quantity} {item.unitText ? `(${item.unitText})` : ""}
                  </span>
                </div>
                <strong>{formatCurrency(item.lineTotal)}</strong>
              </div>
            ))
          ) : (
            <p>No ordered items available.</p>
          )}
        </div>
      </section>

      <div className={styles.grid}>
        <section className={styles.card}>
          <h2>Additional charges</h2>
          <div className={styles.chargesList}>
            {charges.length > 0 ? (
              charges.map((charge, index) => (
                <div key={`${charge.title}-${index}`} className={styles.summaryRow}>
                  <span>{charge.title}</span>
                  <strong>{formatCurrency(charge.amount)}</strong>
                </div>
              ))
            ) : (
              <p>No additional charges.</p>
            )}
          </div>
        </section>

        <section className={styles.card}>
          <h2>Billing details</h2>
          <div className={styles.detailList}>
            <div>
              <span>Name</span>
              <strong>{String(billing?.name || "-")}</strong>
            </div>
            <div>
              <span>Address</span>
              <strong>{billingAddress}</strong>
            </div>
            <div>
              <span>Phone</span>
              <strong>{String(billing?.phone || "-")}</strong>
            </div>
            <div>
              <span>Email</span>
              <strong>{String(billing?.email || "-")}</strong>
            </div>
          </div>
        </section>
      </div>

      <section className={styles.card}>
        <div className={styles.actions}>
          {canTrack ? (
            <button type="button" className={styles.primaryButton} onClick={() => void handleTrackOrder()} disabled={actionLoading}>
              {actionLoading ? "Please wait..." : "Track Order"}
            </button>
          ) : null}
          {canCancel ? (
            <button type="button" className={styles.dangerButton} onClick={() => void handleCancelOrder()} disabled={actionLoading}>
              {actionLoading ? "Please wait..." : "Cancel Order"}
            </button>
          ) : null}
          <button type="button" className={styles.secondaryButton} onClick={handleDownloadInvoice} disabled={actionLoading}>
            Download Invoice
          </button>
          <Link href="/orders/all" className={styles.secondaryButton}>
            Back to All Orders
          </Link>
        </div>
      </section>
    </section>
  );
}

