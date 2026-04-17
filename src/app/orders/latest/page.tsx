"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getLatestOrder } from "@/api";
import { formatCurrency } from "@/shared/lib/format-currency";
import { notifyOrAlert } from "@/shared/lib/notify";
import styles from "./page.module.css";

type OrderLike = Record<string, any>;

type OrderItemLike = {
  name: string;
  quantity: number;
  lineTotal: number;
  image: string;
};

type ChargeLike = {
  title: string;
  amount: number;
};

type TimelineStep = {
  key: string;
  label: string;
  timestamp: string | null;
};

type TimelineStepView = TimelineStep & {
  state: "done" | "active" | "upcoming";
};

function toReadableMessage(value: unknown): string {
  if (!value) {
    return "";
  }
  if (typeof value === "string") {
    return value.trim();
  }
  if (Array.isArray(value)) {
    const text = value
      .map((entry) => toReadableMessage(entry))
      .filter(Boolean)
      .join(" ");
    return text.trim();
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const preferred =
      toReadableMessage(obj.message) ||
      toReadableMessage(obj.error) ||
      toReadableMessage(obj.reason) ||
      toReadableMessage(obj.detail) ||
      toReadableMessage(obj.title) ||
      "";
    if (preferred) {
      return preferred;
    }
  }
  return "";
}

function getErrorMessage(value: any, fallback = "Unable to fetch latest order.") {
  const rawMessage =
    value?.response?.data?.message ||
    value?.response?.data?.data?.message ||
    value?.message ||
    value?.data?.message ||
    value?.data?.data?.message;
  const message = toReadableMessage(rawMessage);
  return message || fallback;
}

function normalizeLatestOrderPayload(response: any): { summary: OrderLike; raw: OrderLike } | null {
  const payloadMessage = response?.data?.data?.message;
  if (Array.isArray(payloadMessage) && payloadMessage[0]) {
    const first = payloadMessage[0];
    return {
      summary: first?.summary || first,
      raw: first,
    };
  }

  const payload = response?.data?.data;
  if (payload?.summary) {
    return {
      summary: payload.summary,
      raw: payload,
    };
  }

  if (Array.isArray(payload) && payload[0]) {
    return {
      summary: payload[0]?.summary || payload[0],
      raw: payload[0],
    };
  }

  const directMessage = response?.data?.message;
  if (Array.isArray(directMessage) && directMessage[0]) {
    const first = directMessage[0];
    return {
      summary: first?.summary || first,
      raw: first,
    };
  }

  const rootMessage = response?.message;
  if (Array.isArray(rootMessage) && rootMessage[0]) {
    const first = rootMessage[0];
    return {
      summary: first?.summary || first,
      raw: first,
    };
  }

  return null;
}

function pickOrderId(summary: OrderLike | null) {
  return String(summary?._id || summary?.id || summary?.order_id || summary?.orderId || "").trim();
}

function pickOrderStatus(summary: OrderLike | null) {
  return String(summary?.state || summary?.order_status || summary?.status || "Placed");
}

function pickPaymentStatus(summary: OrderLike | null) {
  return String(summary?.payment_details?.status || summary?.payment_status || summary?.paymentStatus || "Pending");
}

function pickOrderDate(summary: OrderLike | null, raw: OrderLike | null) {
  const rawDate = summary?.order_placed_timestamp || raw?.createdAt || summary?.created_at || summary?.createdAt;
  if (!rawDate) {
    return "-";
  }
  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) {
    return String(rawDate);
  }
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function pickOrderTotal(summary: OrderLike | null) {
  const raw =
    summary?.grand_total ??
    summary?.total_amount ??
    summary?.order_value ??
    summary?.amount_due ??
    summary?.amount ??
    0;
  const value = Number(raw);
  return Number.isFinite(value) ? value : 0;
}

function pickSubtotal(summary: OrderLike | null) {
  const raw = summary?.original_amount ?? summary?.items?.reduce?.((sum: number, item: any) => sum + Number(item?.total_amount || 0), 0) ?? 0;
  const value = Number(raw);
  return Number.isFinite(value) ? value : 0;
}

function pickOrderDateRaw(summary: OrderLike | null, raw: OrderLike | null) {
  const rawDate = summary?.order_placed_timestamp || raw?.createdAt || summary?.created_at || summary?.createdAt;
  if (!rawDate) {
    return "-";
  }
  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) {
    return String(rawDate);
  }
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function pickExpectedDelivery(summary: OrderLike | null) {
  const raw = summary?.expected_delivery_time;
  if (!raw) {
    return "-";
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return String(raw);
  }
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function pickAddress(summary: OrderLike | null) {
  const address = summary?.billings?.address || summary?.shipping_address || summary?.delivery_address || summary?.address;
  if (!address) {
    return "-";
  }
  if (typeof address === "string") {
    return address;
  }
  const parts = [address?.building, address?.locality, address?.city, address?.state, address?.area_code || address?.pincode].filter(Boolean);
  return parts.join(", ") || "-";
}

function pickCustomerName(summary: OrderLike | null) {
  return String(summary?.billings?.name || summary?.user_name || "Customer");
}

function pickPhone(summary: OrderLike | null) {
  return String(summary?.billings?.phone || summary?.provider_contact_no || "-");
}

function pickProviderName(summary: OrderLike | null) {
  return String(summary?.provider_name || "-");
}

function pickPaymentMethod(summary: OrderLike | null) {
  return String(summary?.payment_method || summary?.payment_details?.type || "-");
}

function normalizeItems(summary: OrderLike | null): OrderItemLike[] {
  const rawItems = Array.isArray(summary?.items) ? summary.items : [];
  return rawItems.map((item: any, index: number) => {
    const quantity = Number(item?.count ?? item?.quantity ?? 1);
    const lineTotal = Number(item?.total_amount ?? item?.amount ?? 0);
    const unitPrice = lineTotal > 0 && quantity > 0 ? lineTotal / quantity : Number(item?.original_amount ?? 0);
    const safeQty = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
    const safePrice = Number.isFinite(unitPrice) ? unitPrice : 0;
    return {
      name: String(item?.name || item?.item_name || item?.title || `Item ${index + 1}`),
      quantity: safeQty,
      lineTotal: safePrice * safeQty,
      image: String(item?.item_symbol || ""),
    };
  });
}

function normalizeCharges(summary: OrderLike | null): ChargeLike[] {
  const otherCharges = Array.isArray(summary?.other_charges) ? summary.other_charges : [];
  return otherCharges.map((charge: any) => ({
    title: String(charge?.title || "Charge"),
    amount: Number(charge?.amount ?? charge?.price?.value ?? 0),
  }));
}

function formatLabel(text: string) {
  return text
    .toLowerCase()
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function normalizeTimestamp(value: unknown) {
  if (!value) {
    return null;
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

function buildTimeline(summary: OrderLike | null): TimelineStepView[] {
  const steps: TimelineStep[] = [
    {
      key: "placed",
      label: "Order placed",
      timestamp: normalizeTimestamp(summary?.order_placed_timestamp),
    },
    {
      key: "packed",
      label: "Packed",
      timestamp: normalizeTimestamp(summary?.order_packed_timestamp),
    },
    {
      key: "agent_assigned",
      label: "Delivery partner assigned",
      timestamp: normalizeTimestamp(summary?.order_agent_assigned_timestamp),
    },
    {
      key: "picked_up",
      label: "Picked up",
      timestamp: normalizeTimestamp(summary?.order_picked_up_timestamp),
    },
    {
      key: "out_for_delivery",
      label: "Out for delivery",
      timestamp: normalizeTimestamp(summary?.order_out_for_delivery_timestamp),
    },
    {
      key: "delivered",
      label: "Delivered",
      timestamp: normalizeTimestamp(summary?.order_delivered_timestamp),
    },
  ];

  const lastCompletedIndex = steps.reduce((acc, step, index) => (step.timestamp ? index : acc), -1);
  const activeIndex = lastCompletedIndex >= 0 ? Math.min(lastCompletedIndex + 1, steps.length - 1) : 0;

  return steps.map((step, index) => {
    if (step.timestamp) {
      return { ...step, state: "done" };
    }
    if (index === activeIndex) {
      return { ...step, state: "active" };
    }
    return { ...step, state: "upcoming" };
  });
}

export default function LatestOrderPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<OrderLike | null>(null);
  const [rawOrder, setRawOrder] = useState<OrderLike | null>(null);

  const fetchLatestOrder = async () => {
    setLoading(true);
    setError("");
    try {
      const response: any = await getLatestOrder();
      const latestOrder = normalizeLatestOrderPayload(response);
      if (!latestOrder) {
        const message = getErrorMessage(response, "Latest order not found.");
        setError(message);
        notifyOrAlert(message, "error");
        setSummary(null);
        setRawOrder(null);
        return;
      }
      setSummary(latestOrder.summary);
      setRawOrder(latestOrder.raw);
    } catch (err: any) {
      const message = getErrorMessage(err, "Unable to fetch latest order.");
      setError(message);
      notifyOrAlert(message, "error");
      setSummary(null);
      setRawOrder(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchLatestOrder();
  }, []);

  const orderId = useMemo(() => pickOrderId(summary), [summary]);
  const orderStatus = useMemo(() => pickOrderStatus(summary), [summary]);
  const paymentStatus = useMemo(() => pickPaymentStatus(summary), [summary]);
  const placedAt = useMemo(() => pickOrderDate(summary, rawOrder), [summary, rawOrder]);
  const placedAtShort = useMemo(() => pickOrderDateRaw(summary, rawOrder), [summary, rawOrder]);
  const eta = useMemo(() => pickExpectedDelivery(summary), [summary]);
  const totalAmount = useMemo(() => pickOrderTotal(summary), [summary]);
  const subtotal = useMemo(() => pickSubtotal(summary), [summary]);
  const deliveryAddress = useMemo(() => pickAddress(summary), [summary]);
  const customerName = useMemo(() => pickCustomerName(summary), [summary]);
  const phone = useMemo(() => pickPhone(summary), [summary]);
  const providerName = useMemo(() => pickProviderName(summary), [summary]);
  const paymentMethod = useMemo(() => pickPaymentMethod(summary), [summary]);
  const items = useMemo(() => normalizeItems(summary), [summary]);
  const charges = useMemo(() => normalizeCharges(summary), [summary]);
  const timeline = useMemo(() => buildTimeline(summary), [summary]);

  if (loading) {
    return (
      <section className={styles.page}>
        <div className={styles.loadingCard}>
          <div className={styles.loaderDots} aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <h2>Loading your latest order</h2>
          <p>Fetching fresh details from server...</p>
        </div>
      </section>
    );
  }

  if (error || !summary) {
    return (
      <section className={styles.page}>
        <div className={styles.card}>
          <p className={styles.kicker}>Latest order</p>
          <h1>Unable to load your latest order.</h1>
          <p>{error || "No latest order found."}</p>
          <div className={styles.actions}>
            <button type="button" className={styles.primaryButton} onClick={fetchLatestOrder}>
              Retry
            </button>
            <Link href="/profile" className={styles.secondaryButton}>
              Go to Profile
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
          <p className={styles.kicker}>Payment Successful</p>
          <h1>Order {orderId || "Placed"} </h1>
          <p>Thanks {customerName}. Your latest order has been created and payment is marked {formatLabel(paymentStatus)}.</p>
          <div className={styles.metaChips}>
            <span>{formatLabel(orderStatus)}</span>
            <span>{formatLabel(paymentStatus)}</span>
            <span>{placedAtShort}</span>
          </div>
        </div>
        <div className={styles.badgeRow}>
          <span>{providerName}</span>
          <span>{formatCurrency(totalAmount)}</span>
        </div>
      </div>

      <section className={styles.card}>
        <h2>Delivery timeline</h2>
        <ol className={styles.stepper}>
          {timeline.map((step, index) => (
            <li key={step.key} className={styles.stepItem}>
              <div className={styles.stepRail} aria-hidden="true">
                <span className={`${styles.stepNode} ${styles[`stepNode_${step.state}`]}`}>
                  {step.state === "done" ? "✓" : index + 1}
                </span>
                {index < timeline.length - 1 ? (
                  <span className={`${styles.stepConnector} ${styles[`stepConnector_${step.state}`]}`} />
                ) : null}
              </div>
              <div className={styles.stepBody}>
                <p className={styles.stepTitle}>{step.label}</p>
                <p className={styles.stepMeta}>{step.timestamp || (step.state === "active" ? "In progress" : "Pending")}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <div className={styles.grid}>
        <section className={styles.card}>
          <h2>Order snapshot</h2>
          <div className={styles.detailList}>
            <div>
              <span>Order ID</span>
              <strong>{orderId || "-"}</strong>
            </div>
            <div>
              <span>Store</span>
              <strong>{providerName}</strong>
            </div>
            <div>
              <span>Placed at</span>
              <strong>{placedAt}</strong>
            </div>
            <div>
              <span>Expected delivery</span>
              <strong>{eta}</strong>
            </div>
            <div>
              <span>Delivery address</span>
              <strong>{deliveryAddress}</strong>
            </div>
            <div>
              <span>Contact</span>
              <strong>{phone}</strong>
            </div>
            <div>
              <span>Payment method</span>
              <strong>{formatLabel(paymentMethod)}</strong>
            </div>
          </div>
        </section>

        <section className={styles.card}>
          <h2>Items and billing</h2>
          <div className={styles.summaryList}>
            {items.length > 0 ? (
              items.map((item, index) => (
                <div key={`${item.name}-${index}`} className={styles.summaryRow}>
                  <div className={styles.itemLead}>
                    {item.image ? <img src={item.image} alt={item.name} /> : <div className={styles.itemPlaceholder} aria-hidden="true" />}
                    <span>
                      {item.name} x {item.quantity}
                    </span>
                  </div>
                  <strong>{formatCurrency(item.lineTotal)}</strong>
                </div>
              ))
            ) : (
              <p>No item details available for this order.</p>
            )}
          </div>
          <div className={styles.chargesList}>
            <div className={styles.summaryRow}>
              <span>Subtotal</span>
              <strong>{formatCurrency(subtotal)}</strong>
            </div>
            {charges.map((charge, index) => (
              <div key={`${charge.title}-${index}`} className={styles.summaryRow}>
                <span>{charge.title}</span>
                <strong>{formatCurrency(charge.amount)}</strong>
              </div>
            ))}
          </div>
          <div className={styles.totalRow}>
            <span>Total</span>
            <strong>{formatCurrency(totalAmount)}</strong>
          </div>
          <div className={styles.actions}>
            {orderId ? (
              <Link href={`/orders/${orderId}`} className={styles.primaryButton}>
                Track this order
              </Link>
            ) : null}
            <Link href="/profile" className={`${styles.secondaryButton} ${styles.backProfileLink}`}>
              <span className={styles.backIcon} aria-hidden="true">←</span>
              <span>Back to Profile</span>
            </Link>
          </div>
        </section>
      </div>
    </section>
  );
}
