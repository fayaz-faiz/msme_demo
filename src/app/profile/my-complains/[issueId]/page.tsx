"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { postIssueById, postIssueCloseById } from "@/api";
import { notifyOrAlert } from "@/shared/lib/notify";
import styles from "./page.module.css";

type IssueItem = {
  id?: string;
  name?: string;
  quantityInUnits?: string;
  quantity?: number;
  itemImageUrl?: string;
};

type IssueAction = {
  short_desc?: string;
  updated_at?: string;
};

type Resolution = {
  short_desc?: string;
  long_desc?: string;
  action_triggered?: string;
  refund_amount?: number;
};

type ResolutionProvider = {
  contact_phone?: string;
  contact_email?: string;
  contact_person?: string;
  organization_name?: string;
};

type IssueDetails = {
  _id?: string;
  order_id?: string;
  status?: string;
  provider_name?: string;
  item_ids?: IssueItem[];
  short_description?: string;
  long_description?: string;
  respondent_actions?: IssueAction[];
  complainant_actions?: IssueAction[];
  expected_response_time?: string;
  expected_resolution_time?: string;
  created_at?: string;
  resolutions?: Resolution | null;
  resolutions_providers?: ResolutionProvider | null;
};

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

function getErrorMessage(value: unknown, fallback: string) {
  const typed = value as {
    response?: { data?: { message?: unknown; data?: { message?: unknown } } };
    message?: unknown;
    data?: { message?: unknown; data?: { message?: unknown } };
  };
  return (
    toReadableMessage(typed?.response?.data?.message) ||
    toReadableMessage(typed?.response?.data?.data?.message) ||
    toReadableMessage(typed?.message) ||
    toReadableMessage(typed?.data?.message) ||
    toReadableMessage(typed?.data?.data?.message) ||
    fallback
  );
}

function formatDateTime(value?: string) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function statusClass(status: string) {
  const normalized = status.toUpperCase();
  if (normalized === "PROCESSED" || normalized === "COMPLETED") {
    return styles.statusProcessed;
  }
  if (normalized === "OPEN" || normalized === "PROCESSING") {
    return styles.statusOpen;
  }
  if (normalized === "CLOSED") {
    return styles.statusClosed;
  }
  return styles.statusDefault;
}

export default function ComplaintDetailsPage() {
  const params = useParams<{ issueId: string }>();
  const router = useRouter();
  const issueId = String(params?.issueId || "");
  const [loading, setLoading] = useState(true);
  const [issue, setIssue] = useState<IssueDetails | null>(null);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [closing, setClosing] = useState(false);
  const didInitialFetch = useRef(false);

  const fetchIssue = useCallback(async () => {
    setLoading(true);
    try {
      const result = await postIssueById({ issue_id: issueId }) as { data?: { status?: boolean; data?: IssueDetails } };
      if (result?.data?.status && result?.data?.data) {
        setIssue(result.data.data);
      } else {
        notifyOrAlert("Issue not found.", "warning");
      }
    } catch (error: unknown) {
      notifyOrAlert(getErrorMessage(error, "Unable to load complaint details."), "error");
    } finally {
      setLoading(false);
    }
  }, [issueId]);

  useEffect(() => {
    if (!issueId || didInitialFetch.current) {
      return;
    }
    didInitialFetch.current = true;
    void fetchIssue();
  }, [issueId, fetchIssue]);

  const onCloseIssue = async (rating: "THUMBS-UP" | "THUMBS-DOWN") => {
    if (!issue?._id || closing) {
      return;
    }
    setClosing(true);
    try {
      const resp = await postIssueCloseById({
        issueId: issue._id,
        status: "CLOSED",
        rating,
      }) as { data?: { data?: { message?: unknown } } };
      notifyOrAlert(toReadableMessage(resp?.data?.data?.message) || "Issue closed successfully.", "success");
      setShowRating(false);
      router.push("/profile/my-complains");
    } catch (error: unknown) {
      notifyOrAlert(getErrorMessage(error, "Unable to close issue."), "error");
    } finally {
      setClosing(false);
    }
  };

  const steps = useMemo(() => {
    const openAt = formatDateTime(issue?.complainant_actions?.[0]?.updated_at || issue?.created_at);
    const processingAt = formatDateTime(issue?.respondent_actions?.[0]?.updated_at);
    const resolvedAt = formatDateTime(issue?.respondent_actions?.[1]?.updated_at);
    const base = [
      { label: "Open", desc: `Complaint created • ${openAt}` },
      { label: "Processing", desc: `Complaint is being processed • ${processingAt}` },
    ];
    if ((issue?.respondent_actions?.length || 0) > 1 || String(issue?.status || "").toUpperCase() === "CLOSED") {
      base.push({ label: "Resolved", desc: `Complaint resolved • ${resolvedAt}` });
    }
    return base;
  }, [issue]);

  const activeStep = useMemo(() => {
    const status = String(issue?.status || "").toUpperCase();
    if (status === "CLOSED") {
      return Math.max(steps.length - 1, 0);
    }
    if (status === "OPEN" || status === "PROCESSING" || status === "PROCESSED") {
      return Math.min(1, Math.max(steps.length - 1, 0));
    }
    return 0;
  }, [issue?.status, steps.length]);

  if (loading) {
    return (
      <section className={styles.page}>
        <article className={styles.card}><p>Loading complaint details...</p></article>
      </section>
    );
  }

  if (!issue) {
    return (
      <section className={styles.page}>
        <article className={styles.card}>
          <h1>Complaint not found</h1>
          <Link href="/profile/my-complains" className={styles.backButton}>Back to Complaints</Link>
        </article>
      </section>
    );
  }

  const items = Array.isArray(issue.item_ids) ? issue.item_ids : [];
  const status = String(issue.status || "OPEN");

  return (
    <section className={styles.page}>
      <header className={styles.hero}>
        <div>
          <p className={styles.kicker}>Complaint</p>
          <h1>Complaint Details</h1>
          <p>Issue ID: {issue._id || "-"}</p>
        </div>
        <div className={styles.heroActions}>
          <span className={`${styles.statusChip} ${statusClass(status)}`}>{status}</span>
          <Link href="/profile/my-complains" className={styles.backButton}>Back to Complaints</Link>
        </div>
      </header>

      <article className={styles.card}>
        <h2>Summary</h2>
        <div className={styles.twoCol}>
          <p><strong>Order ID:</strong> {issue.order_id || "-"}</p>
          <p><strong>Raised:</strong> {formatDateTime(issue.created_at)}</p>
          <p><strong>Provider:</strong> {issue.provider_name || "-"}</p>
          <p><strong>Provider status:</strong> {issue.respondent_actions?.[0]?.short_desc || "-"}</p>
        </div>
      </article>

      <article className={styles.card}>
        <h2>Items</h2>
        <div className={styles.itemList}>
          {items.map((item, index) => (
            <div key={`${item.id || item.name}-${index}`} className={styles.itemCard}>
              <img src={item.itemImageUrl || "https://via.placeholder.com/70x70?text=Item"} alt={item.name || "Item"} />
              <div>
                <h3>{item.name || "Item"}</h3>
                <p><strong>Qty:</strong> {item.quantity || 0}</p>
                <p><strong>Units:</strong> {item.quantityInUnits || "-"}</p>
              </div>
            </div>
          ))}
        </div>
        <p><strong>Short Description:</strong> {issue.short_description || "-"}</p>
        <p><strong>Long Description:</strong> {issue.long_description || "-"}</p>
        <p><strong>Expected Response Time:</strong> {formatDateTime(issue.expected_response_time)}</p>
        <p><strong>Expected Resolution Time:</strong> {formatDateTime(issue.expected_resolution_time)}</p>
      </article>

      <article className={styles.card}>
        <div className={styles.sectionTop}>
          <h2>Complaint Progress</h2>
          {status.toUpperCase() !== "CLOSED" ? (
            <button type="button" className={styles.closeIssueButton} onClick={() => setShowConfirmClose(true)}>
              Close Issue
            </button>
          ) : null}
        </div>
        <ol className={styles.stepper}>
          {steps.map((step, index) => (
            <li key={step.label} className={styles.stepItem}>
              <span className={`${styles.stepDot} ${index <= activeStep ? styles.stepDone : ""}`}>{index + 1}</span>
              <div>
                <h3>{step.label}</h3>
                <p>{step.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </article>

      {issue.resolutions ? (
        <article className={styles.card}>
          <h2>Resolution Details</h2>
          <div className={styles.twoCol}>
            <p><strong>Short Description:</strong> {issue.resolutions.short_desc || "-"}</p>
            <p><strong>Long Description:</strong> {issue.resolutions.long_desc || "-"}</p>
            <p><strong>Action Triggered:</strong> {issue.resolutions.action_triggered || "-"}</p>
            <p><strong>Refund Amount:</strong> {issue.resolutions.refund_amount ?? "-"}</p>
          </div>
          <h3 className={styles.subTitle}>Resolution Provider</h3>
          <div className={styles.twoCol}>
            <p><strong>Contact:</strong> {issue.resolutions_providers?.contact_phone || "-"}</p>
            <p><strong>Email:</strong> {issue.resolutions_providers?.contact_email || "-"}</p>
            <p><strong>Name:</strong> {issue.resolutions_providers?.contact_person || "-"}</p>
            <p><strong>Organization:</strong> {issue.resolutions_providers?.organization_name || "-"}</p>
          </div>
        </article>
      ) : null}

      {showConfirmClose ? (
        <div className={styles.modalBackdrop} role="presentation" onClick={() => setShowConfirmClose(false)}>
          <div className={styles.modalCard} role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <h3>Close this issue?</h3>
            <p>Are you sure you want to close this complaint?</p>
            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryButton} onClick={() => setShowConfirmClose(false)}>No</button>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => {
                  setShowConfirmClose(false);
                  setShowRating(true);
                }}
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showRating ? (
        <div className={styles.modalBackdrop} role="presentation" onClick={() => setShowRating(false)}>
          <div className={styles.modalCard} role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <h3>Did you like the resolution?</h3>
            <p>Your feedback helps improve complaint handling.</p>
            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryButton} disabled={closing} onClick={() => void onCloseIssue("THUMBS-DOWN")}>
                {closing ? "Submitting..." : "No"}
              </button>
              <button type="button" className={styles.primaryButton} disabled={closing} onClick={() => void onCloseIssue("THUMBS-UP")}>
                {closing ? "Submitting..." : "Yes"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
