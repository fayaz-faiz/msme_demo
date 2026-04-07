"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { postMyIssuesData } from "@/api";
import { notifyOrAlert } from "@/shared/lib/notify";
import styles from "./page.module.css";

type IssueItem = {
  id?: string;
  name?: string;
  itemImageUrl?: string;
};

type IssueSummary = {
  _id?: string;
  status?: string;
  provider_name?: string;
  item_ids?: IssueItem[];
};

type ComplaintRow = {
  _id?: string;
  summary?: IssueSummary;
  createdAt?: string;
};

const PAGE_SIZE = 10;

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
      toReadableMessage(obj.detail) ||
      toReadableMessage(obj.reason) ||
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

function parseIssuesResponse(response: unknown): { rows: ComplaintRow[]; totalIssues: number; page: number; totalPages: number } {
  const typed = response as {
    data?: {
      status?: boolean;
      data?: {
        data?: {
          page?: number;
          total_issues?: number;
          total_page?: number;
          data?: ComplaintRow[];
        };
      };
    };
  };

  const bucket = typed?.data?.data?.data;
  const rows = Array.isArray(bucket?.data) ? bucket.data : [];
  return {
    rows,
    totalIssues: Number(bucket?.total_issues || 0),
    page: Number(bucket?.page || 1),
    totalPages: Number(bucket?.total_page || 1),
  };
}

function formatDateTime(value?: string) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
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

export default function MyComplainsPage() {
  const [complaints, setComplaints] = useState<ComplaintRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalComplaints, setTotalComplaints] = useState(0);
  const didInitialFetch = useRef(false);

  const fetchComplaints = async (targetPage: number, append: boolean) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setError("");
    }
    try {
      const response = await postMyIssuesData({ page: targetPage, pageSize: PAGE_SIZE });
      const parsed = parseIssuesResponse(response);
      setComplaints((previous) => (append ? [...previous, ...parsed.rows] : parsed.rows));
      setPage(parsed.page + 1);
      setTotalPages(parsed.totalPages || 1);
      setTotalComplaints(parsed.totalIssues);
    } catch (err: unknown) {
      const message = getErrorMessage(err, "Unable to load complaints.");
      setError(message);
      notifyOrAlert(message, "error");
      if (!append) {
        setComplaints([]);
      }
    } finally {
      if (append) {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (didInitialFetch.current) {
      return;
    }
    didInitialFetch.current = true;
    void fetchComplaints(1, false);
  }, []);

  const hasMore = useMemo(() => page <= totalPages, [page, totalPages]);

  return (
    <section className={styles.page}>
      <header className={styles.hero}>
        <div>
          <p className={styles.kicker}>Profile</p>
          <h1>My Complaints</h1>
          <p>Track your raised issues and check the latest complaint status updates.</p>
        </div>
        <div className={styles.heroActions}>
          <span className={styles.totalBadge}>Total: {totalComplaints || complaints.length}</span>
          <Link href="/profile" className={styles.backButton}>Back to Profile</Link>
        </div>
      </header>

      <section className={styles.card}>
        {loading ? (
          <p className={styles.emptyState}>Loading complaints...</p>
        ) : error ? (
          <div className={styles.errorWrap}>
            <p className={styles.emptyState}>{error}</p>
            <button type="button" className={styles.primaryButton} onClick={() => void fetchComplaints(1, false)}>
              Retry
            </button>
          </div>
        ) : complaints.length === 0 ? (
          <p className={styles.emptyState}>No complaints found yet.</p>
        ) : (
          <div className={styles.list}>
            {complaints.map((complaint, index) => {
              const issueId = String(complaint?._id || "-");
              const status = String(complaint?.summary?.status || "OPEN");
              const items = Array.isArray(complaint?.summary?.item_ids) ? complaint.summary?.item_ids : [];
              const primaryItem = items?.[0];
              const extraCount = Math.max(0, (items?.length || 0) - 1);
              return (
                <article key={`${issueId}-${index}`} className={styles.issueCard}>
                  <div className={styles.cardTop}>
                    <div>
                      <p className={styles.issueId}>Issue ID: {issueId}</p>
                      <h3>{primaryItem?.name || "Complaint item"}</h3>
                    </div>
                    <span className={`${styles.statusChip} ${statusClass(status)}`}>{status}</span>
                  </div>

                  <div className={styles.itemRow}>
                    <img
                      src={primaryItem?.itemImageUrl || "https://via.placeholder.com/96x96?text=Item"}
                      alt={primaryItem?.name || "Item"}
                    />
                    <div className={styles.metaWrap}>
                      <p><strong>Seller:</strong> {complaint?.summary?.provider_name || "-"}</p>
                      <p><strong>Raised:</strong> {formatDateTime(complaint?.createdAt)}</p>
                      {extraCount > 0 ? <p><strong>Items:</strong> +{extraCount} more</p> : null}
                    </div>
                  </div>
                  <div className={styles.actionRow}>
                    <Link href={`/profile/my-complains/${issueId}`} className={styles.detailsButton}>
                      View Details
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {!loading && !error && complaints.length > 0 ? (
          <div className={styles.loadWrap}>
            {hasMore ? (
              <button type="button" className={styles.primaryButton} disabled={loadingMore} onClick={() => void fetchComplaints(page, true)}>
                {loadingMore ? "Loading..." : "Load more complaints"}
              </button>
            ) : (
              <p className={styles.endText}>You have reached the end of complaint history.</p>
            )}
          </div>
        ) : null}
      </section>
    </section>
  );
}
