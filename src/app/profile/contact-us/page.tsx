"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getCantactDetails } from "@/api";
import { notifyOrAlert } from "@/shared/lib/notify";
import styles from "./page.module.css";

type ContactRow = Record<string, unknown>;

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value === "object" && value !== null) {
    return value as Record<string, unknown>;
  }
  return undefined;
}

function toText(value: unknown) {
  return String(value || "").trim();
}

function getMessage(error: unknown, fallback: string) {
  const typed = error as {
    response?: { data?: { message?: unknown; data?: { message?: unknown } } };
    message?: unknown;
    data?: { message?: unknown; data?: { message?: unknown } };
  };
  return (
    toText(typed?.response?.data?.message) ||
    toText(typed?.response?.data?.data?.message) ||
    toText(typed?.message) ||
    toText(typed?.data?.message) ||
    toText(typed?.data?.data?.message) ||
    fallback
  );
}

function parseRows(response: unknown): ContactRow[] {
  const typed = response as { data?: unknown; message?: unknown };
  if (Array.isArray(typed?.data)) {
    return typed.data as ContactRow[];
  }
  const dataRecord = asRecord(typed?.data);
  if (dataRecord && !Array.isArray(dataRecord) && (dataRecord.phoneNo || dataRecord.email || dataRecord.phone)) {
    return [dataRecord];
  }
  if (Array.isArray(dataRecord?.data)) {
    return dataRecord.data as ContactRow[];
  }
  if (asRecord(dataRecord?.data)) {
    return [dataRecord?.data as ContactRow];
  }
  if (Array.isArray(typed?.message)) {
    return typed.message as ContactRow[];
  }
  return [];
}

export default function ContactUsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rows, setRows] = useState<ContactRow[]>([]);

  useEffect(() => {
    const fetchContent = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await getCantactDetails();
        const parsed = parseRows(response);
        setRows(parsed);
        if (!parsed.length) {
          setError("No contact details found.");
        }
      } catch (err: unknown) {
        const message = getMessage(err, "Unable to load contact details.");
        setError(message);
        notifyOrAlert(message, "error");
      } finally {
        setLoading(false);
      }
    };
    void fetchContent();
  }, []);

  const primary = useMemo(() => rows[0] || {}, [rows]);
  const heading = toText(primary.heading) || "Contact Us";
  const email = toText(primary.email || primary.support_email || primary.mail);
  const phone = toText(primary.phoneNo || primary.phone || primary.mobileNumber || primary.mobile || primary.contact_number);
  const address = toText(primary.address || primary.office_address || primary.location);
  const website = toText(primary.website || primary.url);

  const paragraphs = useMemo(
    () =>
      Object.keys(primary)
        .filter((key) => /^paragraph_\d+$/i.test(key))
        .sort((a, b) => Number(a.split("_")[1]) - Number(b.split("_")[1]))
        .map((key) => toText(primary[key]))
        .filter(Boolean),
    [primary],
  );

  return (
    <section className={styles.page}>
      <article className={styles.heroCard}>
        <div>
          <p className={styles.kicker}>Profile</p>
          <h1>{heading}</h1>
          <p className={styles.subText}>Reach our support team for any account, order, or platform help.</p>
        </div>
        <Link href="/profile" className={styles.backButton}>Back to Profile</Link>
      </article>

      {loading ? <p className={styles.infoBanner}>Loading contact details...</p> : null}
      {!loading && error ? <p className={styles.infoBanner}>{error}</p> : null}

      {!loading && !error ? (
        <>
          <section className={styles.grid}>
            <article className={styles.contactCard}>
              <p className={styles.label}>Phone</p>
              {phone ? <a href={`tel:${phone}`}>{phone}</a> : <span>-</span>}
            </article>
            <article className={styles.contactCard}>
              <p className={styles.label}>Email</p>
              {email ? <a href={`mailto:${email}`}>{email}</a> : <span>-</span>}
            </article>
            <article className={styles.contactCard}>
              <p className={styles.label}>Website</p>
              {website ? (
                <a href={website.startsWith("http") ? website : `https://${website}`} target="_blank" rel="noreferrer">
                  {website}
                </a>
              ) : (
                <span>-</span>
              )}
            </article>
          </section>

          <section className={styles.contentCard}>
            <h2>Office Address</h2>
            <p>{address || "Address details are currently unavailable."}</p>
          </section>

          {paragraphs.length ? (
            <section className={styles.contentCard}>
              <h2>Support Information</h2>
              <div className={styles.paragraphs}>
                {paragraphs.map((text, index) => (
                  <p key={`${index}-${text.slice(0, 20)}`}>{text}</p>
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
