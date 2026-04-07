"use client";

import Link from "next/link";
import styles from "./page.module.css";

export default function MyComplainsPage() {
  return (
    <section className={styles.page}>
      <article className={styles.card}>
        <p className={styles.kicker}>Profile</p>
        <h1>My Complains</h1>
        <p>This page is ready. API integration and final UI can be added next.</p>
        <Link href="/profile" className={styles.backButton}>Back to Profile</Link>
      </article>
    </section>
  );
}
