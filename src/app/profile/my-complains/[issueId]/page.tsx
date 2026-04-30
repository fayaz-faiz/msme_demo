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
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) {
    return value
      .map((entry) => toReadableMessage(entry))
      .filter(Boolean)
      .join(" ")
      .trim();
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
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function statusClass(status: string) {
  const s = status.toUpperCase();
  if (s === "PROCESSED" || s === "COMPLETED") return styles.statusProcessed;
  if (s === "OPEN" || s === "PROCESSING") return styles.statusOpen;
  if (s === "CLOSED") return styles.statusClosed;
  return styles.statusDefault;
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  return (
    <div className={styles.infoRow}>
      <span className={styles.infoLabel}>{label}</span>
      <span className={styles.infoValue}>{value ?? "-"}</span>
    </div>
  );
}

function SkeletonLoading() {
  return (
    <div className={styles.skeleton}>
      <div className={styles.skeletonHero} />
      {[90, 110, 140].map((h) => (
        <div key={h} className={styles.skeletonCard}>
          <div className={styles.skeletonCardInner}>
            <div className={`${styles.skeletonLine} ${styles.lineShort}`} />
            <div className={`${styles.skeletonLine} ${styles.lineFull}`} />
            <div className={`${styles.skeletonLine} ${styles.lineMed}`} />
          </div>
        </div>
      ))}
    </div>
  );
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
      const result = (await postIssueById({ issue_id: issueId })) as {
        data?: { status?: boolean; data?: IssueDetails };
      };
      if (result?.data?.status && result?.data?.data) {
        setIssue(result.data.data);
      } else {
        notifyOrAlert("Issue not found.", "warning");
      }
    } catch (error: unknown) {
      notifyOrAlert(
        getErrorMessage(error, "Unable to load complaint details."),
        "error",
      );
    } finally {
      setLoading(false);
    }
  }, [issueId]);

  useEffect(() => {
    if (!issueId || didInitialFetch.current) return;
    didInitialFetch.current = true;
    void fetchIssue();
  }, [issueId, fetchIssue]);

  const onCloseIssue = async (rating: "THUMBS-UP" | "THUMBS-DOWN") => {
    if (!issue?._id || closing) return;
    setClosing(true);
    try {
      const resp = (await postIssueCloseById({
        issueId: issue._id,
        status: "CLOSED",
        rating,
      })) as { data?: { data?: { message?: unknown } } };
      notifyOrAlert(
        toReadableMessage(resp?.data?.data?.message) ||
          "Issue closed successfully.",
        "success",
      );
      setShowRating(false);
      router.push("/profile/my-complains");
    } catch (error: unknown) {
      notifyOrAlert(getErrorMessage(error, "Unable to close issue."), "error");
    } finally {
      setClosing(false);
    }
  };

  const steps = useMemo(() => {
    const openAt = formatDateTime(
      issue?.complainant_actions?.[0]?.updated_at || issue?.created_at,
    );
    const processingAt = formatDateTime(
      issue?.respondent_actions?.[0]?.updated_at,
    );
    const resolvedAt = formatDateTime(
      issue?.respondent_actions?.[1]?.updated_at,
    );
    const base = [
      { label: "Opened", desc: `Complaint submitted · ${openAt}` },
      { label: "Processing", desc: `Under review · ${processingAt}` },
    ];
    if (
      (issue?.respondent_actions?.length || 0) > 1 ||
      String(issue?.status || "").toUpperCase() === "CLOSED"
    ) {
      base.push({
        label: "Resolved",
        desc: `Complaint resolved · ${resolvedAt}`,
      });
    }
    return base;
  }, [issue]);

  const activeStep = useMemo(() => {
    const status = String(issue?.status || "").toUpperCase();
    if (status === "CLOSED") return Math.max(steps.length - 1, 0);
    if (
      status === "OPEN" ||
      status === "PROCESSING" ||
      status === "PROCESSED"
    ) {
      return Math.min(1, Math.max(steps.length - 1, 0));
    }
    return 0;
  }, [issue?.status, steps.length]);

  if (loading) return <SkeletonLoading />;

  if (!issue) {
    return (
      <div className={styles.notFound}>
        <p className={styles.notFoundTitle}>Complaint not found</p>
        <p className={styles.notFoundSub}>
          This complaint may have been removed or the ID is invalid.
        </p>
        <Link href="/profile/my-complains" className={styles.backButton}>
          ← Back to Complaints
        </Link>
      </div>
    );
  }

  const items = Array.isArray(issue.item_ids) ? issue.item_ids : [];
  const status = String(issue.status || "OPEN");
  const isClosed = status.toUpperCase() === "CLOSED";

  return (
    <div className={styles.page}>
      {/* Hero */}
      <header className={styles.hero}>
        <div className={styles.heroLeft}>
          <span className={styles.kicker}>Complaint</span>
          <h1 className={styles.heroTitle}>Complaint Details</h1>
          <p className={styles.heroId}>{issue._id || "-"}</p>
        </div>
        <div className={styles.heroRight}>
          <Link href="/profile/my-complains" className={styles.backButton}>
            ← Back
          </Link>
          <span className={`${styles.statusChip} ${statusClass(status)}`}>
            {status}
          </span>
        </div>
      </header>

      {/* Summary */}
      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Summary</h2>
        </div>
        <div className={styles.cardBody}>
          <div className={styles.infoGrid}>
            <InfoRow label="Order ID" value={issue.order_id} />
            <InfoRow
              label="Raised on"
              value={formatDateTime(issue.created_at)}
            />
            <InfoRow label="Provider" value={issue.provider_name} />
            <InfoRow
              label="Provider status"
              value={issue.respondent_actions?.[0]?.short_desc}
            />
            <InfoRow
              label="Expected response"
              value={formatDateTime(issue.expected_response_time)}
            />
            <InfoRow
              label="Expected resolution"
              value={formatDateTime(issue.expected_resolution_time)}
            />
          </div>
        </div>
      </section>

      {/* Items */}
      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Items</h2>
        </div>
        <div className={styles.cardBody}>
          {items.length > 0 && (
            <div className={styles.itemList}>
              {items.map((item, index) => (
                <div
                  key={`${item.id || item.name}-${index}`}
                  className={styles.itemCard}
                >
                  <img
                    src={
                      item.itemImageUrl ||
                      "https://via.placeholder.com/64x64?text=Item"
                    }
                    alt={item.name || "Item"}
                    className={styles.itemImg}
                  />
                  <div className={styles.itemInfo}>
                    <p className={styles.itemName}>{item.name || "Item"}</p>
                    <div className={styles.itemMeta}>
                      <span className={styles.itemMetaItem}>
                        Qty: {item.quantity || 0}
                      </span>
                      <span className={styles.itemMetaItem}>
                        {item.quantityInUnits || "-"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <hr
            className={styles.divider}
            style={{ margin: items.length > 0 ? "1rem 0" : "0 0 0.5rem" }}
          />
          <div className={styles.infoGrid}>
            <InfoRow
              label="Short description"
              value={issue.short_description}
            />
            <InfoRow label="Long description" value={issue.long_description} />
          </div>
        </div>
      </section>

      {/* Progress */}
      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Progress</h2>
          {!isClosed && (
            <button
              type="button"
              className={styles.closeIssueButton}
              onClick={() => setShowConfirmClose(true)}
            >
              Close issue
            </button>
          )}
        </div>
        <div className={styles.cardBody}>
          <ol className={styles.stepper}>
            {steps.map((step, index) => {
              const done = index <= activeStep;
              const isLast = index === steps.length - 1;
              return (
                <li key={step.label} className={styles.stepItem}>
                  <div className={styles.stepLeft}>
                    <span
                      className={`${styles.stepDot} ${done ? styles.stepDone : ""}`}
                    >
                      {index + 1}
                    </span>
                    {!isLast && (
                      <div
                        className={`${styles.stepConnector} ${done ? styles.stepConnectorDone : ""}`}
                      />
                    )}
                  </div>
                  <div className={styles.stepContent}>
                    <p className={styles.stepLabel}>{step.label}</p>
                    <p className={styles.stepDesc}>{step.desc}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* Resolution */}
      {issue.resolutions && (
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Resolution</h2>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.infoGrid}>
              <InfoRow
                label="Short description"
                value={issue.resolutions.short_desc}
              />
              <InfoRow
                label="Long description"
                value={issue.resolutions.long_desc}
              />
              <InfoRow
                label="Action triggered"
                value={issue.resolutions.action_triggered}
              />
              <InfoRow
                label="Refund amount"
                value={issue.resolutions.refund_amount}
              />
            </div>
            <hr className={styles.divider} style={{ margin: "1.25rem 0" }} />
            <p className={styles.infoLabel} style={{ marginBottom: "0.75rem" }}>
              Resolution provider
            </p>
            <div className={styles.infoGrid}>
              <InfoRow
                label="Name"
                value={issue.resolutions_providers?.contact_person}
              />
              <InfoRow
                label="Organization"
                value={issue.resolutions_providers?.organization_name}
              />
              <InfoRow
                label="Phone"
                value={issue.resolutions_providers?.contact_phone}
              />
              <InfoRow
                label="Email"
                value={issue.resolutions_providers?.contact_email}
              />
            </div>
          </div>
        </section>
      )}

      {/* Confirm close modal */}
      {showConfirmClose && (
        <div
          className={styles.modalBackdrop}
          role="presentation"
          onClick={() => setShowConfirmClose(false)}
        >
          <div
            className={styles.modalCard}
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <p className={styles.modalTitle}>Close this complaint?</p>
            <p className={styles.modalSub}>
              This action cannot be undone. The complaint will be marked as
              closed.
            </p>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setShowConfirmClose(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => {
                  setShowConfirmClose(false);
                  setShowRating(true);
                }}
              >
                Yes, close it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rating modal */}
      {showRating && (
        <div
          className={styles.modalBackdrop}
          role="presentation"
          onClick={() => !closing && setShowRating(false)}
        >
          <div
            className={styles.modalCard}
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <p className={styles.modalTitle}>How was the resolution?</p>
            <p className={styles.modalSub}>
              Your feedback helps improve the support experience.
            </p>
            <div className={styles.ratingButtons}>
              <button
                type="button"
                className={styles.ratingNo}
                disabled={closing}
                onClick={() => void onCloseIssue("THUMBS-DOWN")}
              >
                <span className={styles.ratingIcon}>👎</span>
                {closing ? "Submitting..." : "Not satisfied"}
              </button>
              <button
                type="button"
                className={styles.ratingYes}
                disabled={closing}
                onClick={() => void onCloseIssue("THUMBS-UP")}
              >
                <span className={styles.ratingIcon}>👍</span>
                {closing ? "Submitting..." : "Satisfied"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
