"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getCancelReasons,
  orderCancelOrder,
  postOrderDertailsById,
  postOrderStatusById,
  postTrackOrder,
} from "@/api";
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
type TrackingInfo = {
  url: string;
  deliveryMode: string;
  trackingStatus: string;
  runnerName: string | null;
  runnerMobile: string | null;
  runnerOtp: string | null;
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
    return value
      .map((entry) => toReadableMessage(entry))
      .filter(Boolean)
      .join(" ")
      .trim();
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

function getErrorMessage(
  value: unknown,
  fallback = "Unable to load order details.",
) {
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
    if (
      Array.isArray(payloadRecord.message) &&
      payloadRecord.message.length > 0
    ) {
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
    const safeQuantity =
      Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
    const safeLineTotal = Number.isFinite(lineTotal) ? lineTotal : 0;
    return {
      name: String(
        item.item_name || item.name || item.title || `Item ${index + 1}`,
      ),
      quantity: safeQuantity,
      lineTotal: safeLineTotal,
      image: String(item.item_symbol || ""),
      unitText: String(item.item_quantity || ""),
    };
  });
}

function normalizeCharges(summary: UnknownRecord | null): ChargeLike[] {
  const rawCharges = Array.isArray(summary?.other_charges)
    ? summary.other_charges
    : [];
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
    {
      key: "placed",
      label: "Order placed",
      time: formatDateTime(summary?.order_placed_timestamp),
    },
    {
      key: "packed",
      label: "Packed",
      time: formatDateTime(summary?.order_packed_timestamp),
    },
    {
      key: "out",
      label: "Out for delivery",
      time: formatDateTime(summary?.order_out_for_delivery_timestamp),
    },
    {
      key: "delivered",
      label: "Order delivered",
      time: formatDateTime(summary?.order_delivered_timestamp),
    },
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
    const state =
      index < active ? "done" : index === active ? "active" : "upcoming";
    return { ...step, state };
  });
}

export default function OrderDetailsPage() {
  const params = useParams<{ orderId: string }>();
  const orderId = Array.isArray(params.orderId)
    ? params.orderId[0]
    : params.orderId;
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [reloadPress, setReloadPress] = useState(false);
  const [trackingInfo, setTrackingInfo] = useState<TrackingInfo | null>(null);
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
    () =>
      String(
        summary?._id || summary?.order_id || summary?.id || orderId || "-",
      ),
    [summary, orderId],
  );
  const status = useMemo(() => String(summary?.status || "Pending"), [summary]);
  const statusLabel = useMemo(() => formatLabel(status), [status]);
  const paymentStatus = useMemo(
    () =>
      formatLabel(String(asRecord(summary?.payment_details)?.status || status)),
    [summary, status],
  );
  const totalAmount = useMemo(() => {
    const value = Number(
      summary?.total_amount ?? summary?.grand_total ?? summary?.amount ?? 0,
    );
    return Number.isFinite(value) ? value : 0;
  }, [summary]);
  const placedAt = useMemo(
    () => formatDateTime(summary?.order_placed_timestamp),
    [summary],
  );
  const providerName = useMemo(
    () => String(summary?.provider_name || "-"),
    [summary],
  );
  const providerAddress = useMemo(
    () => pickAddressText(summary?.provider_address),
    [summary],
  );
  const billing = useMemo(() => asRecord(summary?.billings), [summary]);
  const billingAddress = useMemo(
    () => pickAddressText(billing?.address),
    [billing],
  );
  const paymentDetails = useMemo(
    () => asRecord(summary?.payment_details),
    [summary],
  );
  const paymentParams = useMemo(
    () => asRecord(paymentDetails?.params),
    [paymentDetails],
  );
  const items = useMemo(() => normalizeItems(summary), [summary]);
  const charges = useMemo(() => normalizeCharges(summary), [summary]);
  const timeline = useMemo(() => buildTimeline(summary), [summary]);
  const canTrack = useMemo(() => {
    const disallowed = [
      "Order-delivered",
      "Cancelled",
      "Failed",
      "Return_Initiated",
      "Return_Approved",
      "Return_Picked",
      "Return_Delivered",
    ];
    return !disallowed.includes(status);
  }, [status]);
  const canRaiseQuery = useMemo(() => {
    return String(status || "").toUpperCase() !== "FAILED";
  }, [status]);
  const canCancel = useMemo(() => {
    const allowedStatuses = ["Pending", "Packed"];
    if (!allowedStatuses.includes(status)) {
      return false;
    }
    const rawItems = Array.isArray(summary?.items) ? summary.items : [];
    return !rawItems.some(
      (rawItem) => asRecord(rawItem)?.item_cancellable_status === false,
    );
  }, [summary, status]);

  const getOrderStatus = async (data: { order_id: string }) => {
    try {
      const response = await postOrderStatusById(data);
      const typed = response as { data?: { status?: boolean } };
      if (typed?.data?.status === true) {
        await fetchOrderDetails();
      }
    } catch {
      // silent — fetchOrderDetails handles its own errors
    } finally {
      setReloadPress(false);
    }
  };

  const reloadBtnPressed = () => {
    const returnStatuses = [
      "Return_Approved",
      "Return_Initiated",
      "Return_Rejected",
      "Return_Pick_Failed",
      "Return_Picked",
    ];
    setReloadPress(true);
    const id = { order_id: normalizedOrderId };
    if (!returnStatuses.includes(status)) {
      void getOrderStatus(id);
    } else {
      void fetchOrderDetails().finally(() => setReloadPress(false));
    }
  };

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
              status?: string;
              deliveryMode?: string;
              runnerName?: string | null;
              runnerMobile?: string | null;
              runnerOtp?: string | null;
              delivery?: {
                runnerName?: string | null;
                runnerMobile?: string | null;
                runnerOtp?: string | null;
              };
            };
            message?: unknown;
          };
          message?: unknown;
        };
      };
      if (!typed?.data?.status) {
        notifyOrAlert(
          toReadableMessage(
            typed?.data?.data?.message || typed?.data?.message,
          ) || "Unable to track order.",
          "warning",
        );
        return;
      }
      const tr = typed?.data?.data?.response;
      const url = String(tr?.url || "").trim();
      if (!url) {
        notifyOrAlert("Tracking URL is not available yet.", "warning");
        return;
      }
      setTrackingInfo({
        url,
        deliveryMode: String(tr?.deliveryMode || "Standard"),
        trackingStatus: String(tr?.status || ""),
        runnerName: tr?.runnerName ?? tr?.delivery?.runnerName ?? null,
        runnerMobile: tr?.runnerMobile ?? tr?.delivery?.runnerMobile ?? null,
        runnerOtp: tr?.runnerOtp ?? tr?.delivery?.runnerOtp ?? null,
      });
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
        notifyOrAlert(
          "Cancellation reason is unavailable right now.",
          "warning",
        );
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
        notifyOrAlert(
          toReadableMessage(
            typed?.data?.data?.message || typed?.data?.message,
          ) || "Unable to cancel order.",
          "warning",
        );
        return;
      }
      notifyOrAlert(
        toReadableMessage(typed?.data?.data?.message) ||
          "Order cancelled successfully.",
        "success",
      );
      await fetchOrderDetails();
    } catch (err: unknown) {
      notifyOrAlert(getErrorMessage(err, "Unable to cancel order."), "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadInvoice = async () => {
    // jsPDF built-in fonts don't support ₹ — use Rs. inside the PDF
    const inr = (value: number) =>
      `Rs. ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value)}`;

    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "a4" });

    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const ml = 40;
    const mr = pageW - 40;
    const cw = mr - ml;
    let y = 0;

    // ── Header bar ──────────────────────────────────────────────────
    doc.setFillColor(252, 128, 25);
    doc.rect(0, 0, pageW, 64, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text("INVOICE", ml, 38);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Order #${normalizedOrderId}`, ml, 54);
    y = 82;

    // ── Meta row ────────────────────────────────────────────────────
    doc.setFontSize(9);
    doc.setTextColor(104, 107, 120);
    doc.text(`Placed: ${placedAt}`, ml, y);
    doc.text(`Status: ${statusLabel}`, mr, y, { align: "right" });
    y += 14;
    doc.setDrawColor(230, 230, 230);
    doc.line(ml, y, mr, y);
    y += 16;

    // ── Provider ────────────────────────────────────────────────────
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(28, 28, 28);
    doc.text("Provider", ml, y);
    y += 13;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(104, 107, 120);
    doc.text(providerName, ml, y);
    y += 12;
    if (providerAddress !== "-") {
      const addrLines = doc.splitTextToSize(providerAddress, cw * 0.6);
      doc.text(addrLines, ml, y);
      y += addrLines.length * 12;
    }
    y += 8;
    doc.setDrawColor(230, 230, 230);
    doc.line(ml, y, mr, y);
    y += 16;

    // ── Items table header ──────────────────────────────────────────
    doc.setFillColor(245, 245, 245);
    doc.rect(ml, y - 4, cw, 20, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(28, 28, 28);
    doc.text("Item", ml + 6, y + 10);
    doc.text("Qty", mr - 90, y + 10, { align: "right" });
    doc.text("Amount", mr, y + 10, { align: "right" });
    y += 24;

    // ── Item rows ───────────────────────────────────────────────────
    for (const item of items) {
      const nameLines = doc.splitTextToSize(item.name, cw - 150);
      const rowH = nameLines.length * 13 + (item.unitText ? 12 : 0) + 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(28, 28, 28);
      doc.text(nameLines, ml + 6, y);
      if (item.unitText) {
        doc.setFontSize(7.5);
        doc.setTextColor(104, 107, 120);
        doc.text(item.unitText, ml + 6, y + nameLines.length * 13);
        doc.setFontSize(9);
      }
      doc.setTextColor(104, 107, 120);
      doc.text(`x${item.quantity}`, mr - 90, y, { align: "right" });
      doc.setTextColor(28, 28, 28);
      doc.text(inr(item.lineTotal), mr, y, { align: "right" });
      y += rowH;
      doc.setDrawColor(245, 245, 245);
      doc.line(ml, y, mr, y);
      y += 4;
    }

    // ── Charges ─────────────────────────────────────────────────────
    if (charges.length > 0) {
      y += 6;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(104, 107, 120);
      doc.text("Additional Charges", ml + 6, y);
      y += 14;
      for (const charge of charges) {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(104, 107, 120);
        doc.text(charge.title, ml + 6, y);
        doc.setTextColor(28, 28, 28);
        doc.text(inr(charge.amount), mr, y, { align: "right" });
        y += 14;
      }
    }

    // ── Total bar ───────────────────────────────────────────────────
    y += 8;
    doc.setDrawColor(230, 230, 230);
    doc.line(ml, y, mr, y);
    y += 10;
    doc.setFillColor(252, 128, 25);
    doc.rect(ml, y, cw, 26, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text("To Pay", ml + 10, y + 17);
    doc.text(inr(totalAmount), mr - 6, y + 17, { align: "right" });
    y += 40;

    // ── Payment + Billing columns ────────────────────────────────────
    doc.setDrawColor(230, 230, 230);
    doc.line(ml, y, mr, y);
    y += 16;
    const colMid = ml + cw / 2 + 8;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(28, 28, 28);
    doc.text("Payment Details", ml, y);
    doc.text("Billing Details", colMid, y);
    y += 14;

    const payRows: [string, string][] = [
      ["Type", String(paymentDetails?.type || "-")],
      ["Status", paymentStatus],
      ["Txn ID", String(paymentParams?.transaction_id || "-")],
      ["Amount", `${String(paymentParams?.currency || "INR")} ${String(paymentParams?.amount || totalAmount)}`],
      ["Method", String(summary?.payment_method || "-")],
    ];
    const billRows: [string, string][] = [
      ["Name", String(billing?.name || "-")],
      ["Phone", String(billing?.phone || "-")],
      ["Email", String(billing?.email || "-")],
      ["Address", billingAddress],
    ];

    const maxRows = Math.max(payRows.length, billRows.length);
    for (let i = 0; i < maxRows; i++) {
      if (payRows[i]) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(104, 107, 120);
        doc.text(payRows[i][0], ml, y);
        doc.setTextColor(28, 28, 28);
        doc.setFont("helvetica", "bold");
        const vLines = doc.splitTextToSize(payRows[i][1], cw / 2 - 50);
        doc.text(vLines, ml + 46, y);
      }
      if (billRows[i]) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(104, 107, 120);
        doc.text(billRows[i][0], colMid, y);
        doc.setTextColor(28, 28, 28);
        doc.setFont("helvetica", "bold");
        const vLines = doc.splitTextToSize(billRows[i][1], cw / 2 - 50);
        doc.text(vLines, colMid + 46, y);
      }
      y += 16;
    }

    // ── Footer ───────────────────────────────────────────────────────
    const fy = pageH - 28;
    doc.setDrawColor(230, 230, 230);
    doc.line(ml, fy - 10, mr, fy - 10);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(104, 107, 120);
    doc.text(`Generated: ${new Date().toLocaleDateString("en-IN")}`, ml, fy);
    doc.text("Thank you for your order!", mr, fy, { align: "right" });

    doc.save(`invoice-${normalizedOrderId}.pdf`);
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <p className={styles.emptyState}>Loading order details...</p>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <Link href="/orders/all" className={styles.backBtn}>
            ← All Orders
          </Link>
          <h1 className={styles.pageHeaderTitle}>Order Details</h1>
        </div>
        <div className={styles.card}>
          <p className={styles.kicker}>Unable to load order</p>
          <p>{error || "Order details are not available right now."}</p>
          <div className={styles.actionsRow} style={{ marginTop: 14 }}>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => void fetchOrderDetails()}
            >
              Retry
            </button>
            <Link href="/orders/all" className={styles.secondaryButton}>
              Back to All Orders
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Sticky header */}
      <div className={styles.pageHeader}>
        <Link href="/orders/all" className={styles.backBtn}>
          ← All Orders
        </Link>
        <h1 className={styles.pageHeaderTitle}>Order Details</h1>
        <span className={styles.statusChip}>{statusLabel}</span>
        <button
          type="button"
          className={styles.reloadBtn}
          onClick={reloadBtnPressed}
          disabled={reloadPress || loading}
          aria-label="Reload order"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={reloadPress ? styles.spinning : undefined}
          >
            <path d="M21 2v6h-6" />
            <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
            <path d="M3 22v-6h6" />
            <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
          </svg>
        </button>
      </div>

      {/* Order summary + provider + actions */}
      <div className={styles.card}>
        <div className={styles.orderInfoTop}>
          <div className={styles.orderMeta}>
            <p className={styles.orderIdText}>Order Id: #{normalizedOrderId}</p>
            <p className={styles.orderDateText}>Placed on {placedAt}</p>
          </div>
          <div className={styles.orderAmountBlock}>
            <span className={styles.orderAmountValue}>
              {formatCurrency(totalAmount)}
            </span>
            <span className={styles.paymentChip}>{paymentStatus}</span>
          </div>
        </div>

        <div className={styles.divider} />

        <div className={styles.providerRow}>
          <div className={styles.providerAvatar}>🏪</div>
          <div className={styles.providerInfo}>
            <p className={styles.providerName}>{providerName}</p>
            <p className={styles.providerAddr}>{providerAddress}</p>
          </div>
        </div>

        {(canTrack || canRaiseQuery) ? (
          <div className={styles.actionsRow}>
            {canTrack ? (
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => void handleTrackOrder()}
                disabled={actionLoading}
              >
                {actionLoading ? "Please wait..." : "Track Order"}
              </button>
            ) : null}
            {canRaiseQuery ? (
              <Link
                href="/profile/my-complains"
                className={styles.secondaryButton}
              >
                Raise Query
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Status timeline */}
      <div className={styles.card}>
        <h2 className={styles.sectionTitle}>Order Status</h2>
        <ol className={styles.stepper}>
          {timeline.map((step, index) => (
            <li key={step.key} className={styles.stepItem}>
              <div className={styles.stepRail} aria-hidden="true">
                <span
                  className={`${styles.stepNode} ${styles[`stepNode_${step.state}`]}`}
                >
                  {step.state === "done" ? "✓" : index + 1}
                </span>
                {index < timeline.length - 1 ? (
                  <span
                    className={`${styles.stepConnector} ${styles[`stepConnector_${step.state}`]}`}
                  />
                ) : null}
              </div>
              <div className={styles.stepBody}>
                <p className={styles.stepTitle}>{step.label}</p>
                <p className={styles.stepMeta}>
                  {step.time === "-"
                    ? step.state === "active"
                      ? "In progress"
                      : "Pending"
                    : step.time}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* Ordered items */}
      <div className={styles.card}>
        <h2 className={styles.sectionTitle}>Items Ordered</h2>
        {items.length > 0 ? (
          items.map((item, index) => (
            <div key={`${item.name}-${index}`} className={styles.itemRow}>
              {item.image ? (
                <img
                  src={item.image}
                  alt={item.name}
                  className={styles.itemImage}
                />
              ) : (
                <div className={styles.itemPlaceholder} aria-hidden="true" />
              )}
              <div className={styles.itemInfo}>
                <p className={styles.itemName}>{item.name}</p>
                {item.unitText ? (
                  <p className={styles.itemUnit}>{item.unitText}</p>
                ) : null}
              </div>
              <div className={styles.itemRight}>
                <span className={styles.itemQty}>×{item.quantity}</span>
                <span className={styles.itemPrice}>
                  {formatCurrency(item.lineTotal)}
                </span>
              </div>
            </div>
          ))
        ) : (
          <p className={styles.emptyState}>No items available.</p>
        )}
      </div>

      {/* Bill details */}
      <div className={styles.card}>
        <h2 className={styles.sectionTitle}>Bill Details</h2>
        {items.map((item, index) => (
          <div key={`bill-item-${index}`} className={styles.billRow}>
            <span>
              {item.name} × {item.quantity}
            </span>
            <span>{formatCurrency(item.lineTotal)}</span>
          </div>
        ))}
        {charges.map((charge, index) => (
          <div key={`bill-charge-${index}`} className={styles.billRow}>
            <span>{charge.title}</span>
            <span>{formatCurrency(charge.amount)}</span>
          </div>
        ))}
        <div className={styles.divider} />
        <div className={styles.billTotal}>
          <strong>To Pay</strong>
          <strong>{formatCurrency(totalAmount)}</strong>
        </div>
      </div>

      {/* Payment + Billing */}
      <div className={styles.grid}>
        <div className={styles.card}>
          <h2 className={styles.sectionTitle}>Payment</h2>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Type</span>
            <span className={styles.detailValue}>
              {String(paymentDetails?.type || "-")}
            </span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Status</span>
            <span className={styles.detailValue}>{paymentStatus}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Transaction</span>
            <span className={styles.detailValue}>
              {String(paymentParams?.transaction_id || "-")}
            </span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Amount</span>
            <span className={styles.detailValue}>
              {String(paymentParams?.currency || "INR")}{" "}
              {String(paymentParams?.amount || totalAmount)}
            </span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Method</span>
            <span className={styles.detailValue}>
              {String(summary?.payment_method || "-")}
            </span>
          </div>
        </div>

        <div className={styles.card}>
          <h2 className={styles.sectionTitle}>Billing</h2>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Name</span>
            <span className={styles.detailValue}>
              {String(billing?.name || "-")}
            </span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Address</span>
            <span className={styles.detailValue}>{billingAddress}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Phone</span>
            <span className={styles.detailValue}>
              {String(billing?.phone || "-")}
            </span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Email</span>
            <span className={styles.detailValue}>
              {String(billing?.email || "-")}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom action bar */}
      <div className={styles.bottomBar}>
        {canCancel ? (
          <button
            type="button"
            className={styles.dangerButton}
            onClick={() => void handleCancelOrder()}
            disabled={actionLoading}
          >
            {actionLoading ? "Please wait..." : "Cancel Order"}
          </button>
        ) : null}
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => void handleDownloadInvoice()}
          disabled={actionLoading}
        >
          Download Invoice
        </button>
      </div>

      {/* Tracking bottom sheet */}
      {trackingInfo ? (
        <div
          className={styles.trackingOverlay}
          onClick={(e) => {
            if (e.target === e.currentTarget) setTrackingInfo(null);
          }}
        >
          <div className={styles.trackingSheet}>
            <div className={styles.trackingHandle} />

            <div className={styles.trackingHeader}>
              <div>
                <h2 className={styles.trackingTitle}>Live Tracking</h2>
                <p className={styles.trackingSubtitle}>
                  Order #{normalizedOrderId}
                </p>
              </div>
              <div className={styles.trackingHeaderRight}>
                {trackingInfo.trackingStatus === "active" ? (
                  <span className={styles.trackingLiveBadge}>
                    <span className={styles.trackingLiveDot} />
                    Live
                  </span>
                ) : null}
                <button
                  type="button"
                  className={styles.trackingCloseBtn}
                  onClick={() => setTrackingInfo(null)}
                  aria-label="Close tracking"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className={styles.trackingMapWrap}>
              <iframe
                src={trackingInfo.url}
                className={styles.trackingIframe}
                title="Order tracking"
                allow="geolocation"
              />
              <a
                href={trackingInfo.url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.trackingOpenLink}
              >
                Open in browser ↗
              </a>
            </div>

            <div className={styles.trackingDetails}>
              <div className={styles.trackingModeRow}>
                <span className={styles.trackingModeChip}>
                  {trackingInfo.deliveryMode === "Self" ? "🏪 Self Delivery" : `🚚 ${trackingInfo.deliveryMode}`}
                </span>
              </div>

              <div className={styles.riderGrid}>
                <div className={styles.riderCard}>
                  <span className={styles.riderIconWrap}>🛵</span>
                  <div>
                    <p className={styles.riderLabel}>Rider</p>
                    <p className={styles.riderValue}>
                      {trackingInfo.runnerName ?? "Not assigned"}
                    </p>
                  </div>
                </div>

                {trackingInfo.runnerMobile ? (
                  <a
                    href={`tel:${trackingInfo.runnerMobile}`}
                    className={`${styles.riderCard} ${styles.riderCardLink}`}
                  >
                    <span className={styles.riderIconWrap}>📞</span>
                    <div>
                      <p className={styles.riderLabel}>Mobile</p>
                      <p className={styles.riderValue}>
                        {trackingInfo.runnerMobile}
                      </p>
                    </div>
                  </a>
                ) : null}

                {trackingInfo.runnerOtp ? (
                  <div className={styles.riderCard}>
                    <span className={styles.riderIconWrap}>🔑</span>
                    <div>
                      <p className={styles.riderLabel}>OTP</p>
                      <p className={`${styles.riderValue} ${styles.riderOtp}`}>
                        {trackingInfo.runnerOtp}
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
