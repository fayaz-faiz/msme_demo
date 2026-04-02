import { Suspense } from "react";
import { LoginForm } from "@/features/auth/components/LoginForm";
import styles from "./page.module.css";

export default function LoginPage() {
  return (
    <section className={styles.page}>
      <div className={styles.frame}>
        <Suspense fallback={<div>Loading...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </section>
  );
}
