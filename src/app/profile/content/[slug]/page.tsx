"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getAboutUs, getCancellationAndreturn, getPrivacyPolicy, getTermsAndConditions } from "@/api";
import { notifyOrAlert } from "@/shared/lib/notify";
import styles from "./page.module.css";

type StaticContentRow = {
  _id?: string;
  heading?: string;
  [key: string]: unknown;
};

type StaticContentConfig = {
  title: string;
  fetcher: () => Promise<unknown>;
};

const CONTENT_MAP: Record<string, StaticContentConfig> = {
  "about-us": { title: "About Us", fetcher: getAboutUs },
  "privacy-policy": { title: "Privacy Policy", fetcher: getPrivacyPolicy },
  "terms-and-conditions": { title: "Terms and Conditions", fetcher: getTermsAndConditions },
  "cancellations-and-returns": { title: "Cancellations and Returns", fetcher: getCancellationAndreturn },
};

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value === "object" && value !== null) {
    return value as Record<string, unknown>;
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
  const record = asRecord(value);
  if (!record) {
    return "";
  }
  return (
    toReadableMessage(record.message) ||
    toReadableMessage(record.error) ||
    toReadableMessage(record.detail) ||
    toReadableMessage(record.reason) ||
    ""
  );
}

function getErrorMessage(value: unknown, fallback: string) {
  const typed = value as {
    response?: { data?: { message?: unknown; data?: unknown } };
    message?: unknown;
    data?: { message?: unknown; data?: unknown };
  };
  return (
    toReadableMessage(typed?.response?.data?.message) ||
    toReadableMessage(typed?.response?.data?.data) ||
    toReadableMessage(typed?.message) ||
    toReadableMessage(typed?.data?.message) ||
    toReadableMessage(typed?.data?.data) ||
    fallback
  );
}

function extractRows(response: unknown): StaticContentRow[] {
  const typed = response as { data?: unknown; message?: unknown };
  const dataBucket = asRecord(typed?.data);
  const primary = dataBucket?.data;
  if (Array.isArray(primary)) {
    return primary.map((entry) => asRecord(entry) || {}).filter((entry) => Object.keys(entry).length > 0) as StaticContentRow[];
  }
  if (Array.isArray(typed?.data)) {
    return typed.data.map((entry) => asRecord(entry) || {}).filter((entry) => Object.keys(entry).length > 0) as StaticContentRow[];
  }
  if (Array.isArray(typed?.message)) {
    return typed.message.map((entry) => asRecord(entry) || {}).filter((entry) => Object.keys(entry).length > 0) as StaticContentRow[];
  }
  return [];
}

type ContentItem =
  | { type: "effective_date"; value: string }
  | { type: "sub_heading"; value: string }
  | { type: "paragraph"; value: string };

function buildContentItems(row: StaticContentRow): ContentItem[] {
  const items: ContentItem[] = [];
  Object.entries(row).forEach(([key, value]) => {
    const text = String(value || "").trim();
    if (!text) {
      return;
    }
    if (key === "effective_date") {
      items.push({ type: "effective_date", value: text });
      return;
    }
    if (/^sub_heading_\d+$/i.test(key)) {
      items.push({ type: "sub_heading", value: text });
      return;
    }
    if (/^paragraph_\d+$/i.test(key)) {
      items.push({ type: "paragraph", value: text });
    }
  });
  return items;
}

export default function ProfileContentPage() {
  const params = useParams<{ slug: string }>();
  const slug = String(params?.slug || "");
  const config = CONTENT_MAP[slug];
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rows, setRows] = useState<StaticContentRow[]>([]);

  useEffect(() => {
    const fetchPageContent = async () => {
      if (!config) {
        setError("Invalid page.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError("");
      try {
        const response = await config.fetcher();
        const nextRows = extractRows(response);
        setRows(nextRows);
        if (nextRows.length === 0) {
          setError("No content found.");
        }
      } catch (err: unknown) {
        const message = getErrorMessage(err, "Unable to load content.");
        setError(message);
        notifyOrAlert(message, "error");
      } finally {
        setLoading(false);
      }
    };
    void fetchPageContent();
  }, [config]);

  const pageTitle = useMemo(() => config?.title || "Profile Content", [config]);

  if (!config) {
    return (
      <section className={styles.page}>
        <article className={styles.card}>
          <h1>Content not found</h1>
          <p>Please use profile links to open supported content pages.</p>
          <Link href="/profile" className={styles.backButton}>Back to Profile</Link>
        </article>
      </section>
    );
  }

  return (
    <section className={styles.page}>
      <article className={styles.card}>
        <div className={styles.topRow}>
          <p className={styles.kicker}>Profile</p>
          <Link href="/profile" className={styles.backButton}>Back to Profile</Link>
        </div>
        <h1>{pageTitle}</h1>
        {loading ? <p className={styles.metaText}>Loading content...</p> : null}
        {!loading && error ? <p className={styles.metaText}>{error}</p> : null}
        {!loading && !error ? (
          <div className={styles.contentStack}>
            {rows.map((row, index) => {
              const heading = String(row.heading || pageTitle);
              const contentItems = buildContentItems(row);
              return (
                <section key={`${row._id || heading}-${index}`} className={styles.contentBlock}>
                  <h2>{heading}</h2>
                  {contentItems.length === 0 ? (
                    <p>No details available right now.</p>
                  ) : (
                    contentItems.map((item, itemIndex) => {
                      if (item.type === "effective_date") {
                        return <p key={`${heading}-date-${itemIndex}`} className={styles.effectiveDate}>{item.value}</p>;
                      }
                      if (item.type === "sub_heading") {
                        return <h3 key={`${heading}-sub-${itemIndex}`}>{item.value}</h3>;
                      }
                      return <p key={`${heading}-p-${itemIndex}`}>{item.value}</p>;
                    })
                  )}
                </section>
              );
            })}
          </div>
        ) : null}
      </article>
    </section>
  );
}
