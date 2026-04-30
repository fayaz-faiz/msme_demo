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

function SkeletonCard() {
  return (
    <div className={styles.skeletonCard}>
      <div className={styles.skeletonImg} />
      <div className={styles.skeletonBody}>
        <div className={`${styles.skeletonLine} ${styles.lineShort}`} />
        <div className={`${styles.skeletonLine} ${styles.lineFull}`} />
        <div className={`${styles.skeletonLine} ${styles.lineMed}`} />
      </div>
    </div>
  );
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
    <div className={styles.page}>
      <header className={styles.hero}>
        <div>
          <span className={styles.kicker}>Profile</span>
          <h1 className={styles.heroTitle}>My Complaints</h1>
          <p className={styles.heroSub}>Track your raised issues and monitor resolution status.</p>
        </div>
        <div className={styles.heroActions}>
          <Link href="/profile" className={styles.backButton}>
            ← Back
          </Link>
          <div className={styles.statBox}>
            <span className={styles.statNum}>{totalComplaints || complaints.length}</span>
            <span className={styles.statLabel}>Total</span>
          </div>
        </div>
      </header>

      <main className={styles.content}>
        {loading ? (
          <div className={styles.list}>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : error ? (
          <div className={styles.errorState}>
            <div className={styles.errorIconWrap}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M10 4v7M10 14.5v.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <p className={styles.errorTitle}>Something went wrong</p>
            <p className={styles.errorMsg}>{error}</p>
            <button type="button" className={styles.retryBtn} onClick={() => void fetchComplaints(1, false)}>
              Try again
            </button>
          </div>
        ) : complaints.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIconWrap}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="4" y="2" width="16" height="20" rx="2" stroke="currentColor" strokeWidth="1.5" />
                <path d="M8 7h8M8 11h8M8 15h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <p className={styles.emptyTitle}>No complaints yet</p>
            <p className={styles.emptySub}>Any issues you raise will appear here.</p>
          </div>
        ) : (
          <div className={styles.list}>
            {complaints.map((complaint, index) => {
              const issueId = String(complaint?._id || "-");
              const status = String(complaint?.summary?.status || "OPEN");
              const items = Array.isArray(complaint?.summary?.item_ids) ? complaint.summary?.item_ids : [];
              const primaryItem = items?.[0];
              const extraCount = Math.max(0, (items?.length || 0) - 1);
              return (
                <article key={`${issueId}-${index}`} className={styles.card}>
                  <div className={styles.cardBody}>
                    <img
                      className={styles.itemImg}
                      src={primaryItem?.itemImageUrl || "https://via.placeholder.com/96x96?text=Item"}
                      alt={primaryItem?.name || "Item"}
                    />
                    <div className={styles.cardInfo}>
                      <div className={styles.cardMeta}>
                        <span className={styles.issueId}>#{issueId.slice(-8)}</span>
                        <span className={`${styles.statusChip} ${statusClass(status)}`}>{status}</span>
                      </div>
                      <h3 className={styles.itemName}>{primaryItem?.name || "Complaint item"}</h3>
                      <div className={styles.metaList}>
                        {complaint?.summary?.provider_name && (
                          <span className={styles.metaItem}>{complaint.summary.provider_name}</span>
                        )}
                        <span className={styles.metaItem}>{formatDateTime(complaint?.createdAt)}</span>
                        {extraCount > 0 && <span className={styles.metaItem}>+{extraCount} more</span>}
                      </div>
                    </div>
                  </div>
                  <div className={styles.cardFooter}>
                    <Link href={`/profile/my-complains/${issueId}`} className={styles.detailsLink}>
                      View Details
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                        <path d="M2 7h10M7 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {!loading && !error && complaints.length > 0 && (
          <div className={styles.loadMore}>
            {hasMore ? (
              <button
                type="button"
                className={styles.loadMoreBtn}
                disabled={loadingMore}
                onClick={() => void fetchComplaints(page, true)}
              >
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            ) : (
              <span className={styles.endText}>You&apos;ve seen all complaints</span>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
