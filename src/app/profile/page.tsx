"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getLatestOrder, getUserProfileDataWeb } from "@/api";
import { useAppDispatch, useAppSelector } from "@/features/cart/store/hooks";
import { loginSuccess } from "@/features/auth/store/authSlice";
import { ORDER_STATUS_STEPS } from "@/features/orders/domain/order";
import { formatCurrency } from "@/shared/lib/format-currency";
import { notifyOrAlert } from "@/shared/lib/notify";
import styles from "./page.module.css";

function getStatusLabel(status: string) {
  return ORDER_STATUS_STEPS.find((step) => step.status === status)?.label ?? "Order placed";
}

function formatPaymentLabel(status: string) {
  return status.replace(/-/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

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

function getErrorMessage(value: unknown, fallback = "Unable to load latest order.") {
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

function normalizeLatestOrder(response: unknown): OrderLike | null {
  const typed = response as { data?: { data?: { message?: unknown }; message?: unknown } };
  const primary = typed?.data?.data?.message;
  if (Array.isArray(primary) && primary[0]) {
    const entry = primary[0] as Record<string, unknown>;
    return (entry?.summary as OrderLike) || (entry as OrderLike);
  }
  const secondary = typed?.data?.message;
  if (Array.isArray(secondary) && secondary[0]) {
    const entry = secondary[0] as Record<string, unknown>;
    return (entry?.summary as OrderLike) || (entry as OrderLike);
  }
  return null;
}

function pickOrderId(order: OrderLike | null) {
  return String(order?._id || order?.id || order?.order_id || order?.orderId || "").trim();
}

function pickOrderTotal(order: OrderLike | null) {
  const raw = order?.grand_total ?? order?.total_amount ?? order?.order_value ?? order?.amount ?? 0;
  const amount = Number(raw);
  return Number.isFinite(amount) ? amount : 0;
}

function pickOrderDate(order: OrderLike | null) {
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
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(date);
}

function pickAddress(order: OrderLike | null) {
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

function pickOrderStatus(order: OrderLike | null) {
  return String(order?.state || order?.status || "Placed");
}

function pickPaymentStatus(order: OrderLike | null) {
  const paymentDetails = asRecord(order?.payment_details);
  return String(paymentDetails?.status || order?.payment_status || "Pending");
}

export default function ProfilePage() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const loginName = useAppSelector((state) => state.authToken.loginName);
  const userName = user?.name?.trim() || "User";
  const userMobile = user?.mobileNumber || "-";
  const [latestOrder, setLatestOrder] = useState<OrderLike | null>(null);
  const [loadingLatest, setLoadingLatest] = useState(false);

  useEffect(() => {
    const fetchLatest = async () => {
      if (!user) {
        return;
      }
      setLoadingLatest(true);
      try {
        const resp = await getLatestOrder();
        setLatestOrder(normalizeLatestOrder(resp));
      } catch (err: unknown) {
        notifyOrAlert(getErrorMessage(err), "error");
        setLatestOrder(null);
      } finally {
        setLoadingLatest(false);
      }
    };
    void fetchLatest();
  }, [user]);

  const latestOrderId = useMemo(() => pickOrderId(latestOrder), [latestOrder]);
  const latestOrderAmount = useMemo(() => pickOrderTotal(latestOrder), [latestOrder]);
  const latestOrderDate = useMemo(() => pickOrderDate(latestOrder), [latestOrder]);
  const latestOrderAddress = useMemo(() => pickAddress(latestOrder), [latestOrder]);
  const latestOrderStatus = useMemo(() => pickOrderStatus(latestOrder), [latestOrder]);
  const latestPaymentStatus = useMemo(() => pickPaymentStatus(latestOrder), [latestOrder]);

  const isUserSession = loginName === "USER";

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!isUserSession) {
        return;
      }
      try {
        const response = await getUserProfileDataWeb();
        const profile = (response as {
          data?: { full_name?: string; mobile_number?: string };
          full_name?: string;
          mobile_number?: string;
        })?.data || (response as { full_name?: string; mobile_number?: string });
        const fullName = String(profile?.full_name || "").trim();
        const mobileNumber = String(profile?.mobile_number || "").trim();

        if (!fullName && !mobileNumber) {
          return;
        }

        dispatch(
          loginSuccess({
            name: fullName || user?.name || "User",
            mobileNumber: mobileNumber || user?.mobileNumber || "",
          }),
        );
      } catch (err) {
        console.error("Profile fetch failed:", err);
      }
    };

    void fetchProfileData();
  }, [dispatch, isUserSession, user?.mobileNumber, user?.name]);

  if (!user && !isUserSession) {
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

  if (!user && isUserSession) {
    return (
      <section className={styles.page}>
        <div className={styles.card}>
          <p className={styles.kicker}>Profile</p>
          <h1>Loading your profile</h1>
          <p>Please wait while we fetch your account details.</p>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.page}>
      <div className={styles.hero}>
        <div>
          <p className={styles.kicker}>Profile</p>
          <h1>{userName}</h1>
          <p>Review your profile details and past orders in one place.</p>
        </div>
        <div className={styles.badgeRow}>
          <span>{userMobile}</span>
        </div>
      </div>

      <div className={styles.grid}>
        <section className={styles.card}>
          <h2>Profile details</h2>
          <div className={styles.detailList}>
            <div>
              <span>Name</span>
              <strong>{userName}</strong>
            </div>
            <div>
              <span>Mobile number</span>
              <strong>{userMobile}</strong>
            </div>
          </div>
          <Link href="/shops" className={styles.secondaryButton}>
            Continue Shopping
          </Link>
        </section>

        <section className={styles.card}>
          <div className={styles.headingRow}>
            <h2>Past Orders</h2>
            <Link href="/orders/all" className={styles.viewAllButton}>
              View all orders
            </Link>
          </div>
          {loadingLatest ? (
            <p className={styles.emptyState}>Loading latest order...</p>
          ) : latestOrder ? (
            <div className={styles.orderList}>
              <article className={styles.orderCard}>
                <div className={styles.orderTop}>
                  <div>
                    <p className={styles.orderId}>Order Id: {latestOrderId || "-"}</p>
                    <h3>{getStatusLabel(latestOrderStatus)}</h3>
                  </div>
                  <div className={styles.amountWrap}>
                    <strong>{formatCurrency(latestOrderAmount)}</strong>
                    <span
                      className={`${styles.paymentTag} ${latestPaymentStatus.toLowerCase() === "paid" ? styles.paymentTagPaid : ""}`}
                    >
                      {formatPaymentLabel(latestPaymentStatus)}
                    </span>
                  </div>
                </div>
                <p className={styles.orderMeta}>{latestOrderAddress}</p>
                <div className={styles.orderActions}>
                  <span>{latestOrderDate}</span>
                  <div className={styles.actionRight}>
                    {latestOrderId ? (
                      <Link href={`/orders/${latestOrderId}`} className={styles.trackButton}>
                        Track Order
                      </Link>
                    ) : null}
                  </div>
                </div>
              </article>
            </div>
          ) : (
            <p className={styles.emptyState}>No orders yet. Place your first order to see it here.</p>
          )}
        </section>
      </div>
    </section>
  );
}
