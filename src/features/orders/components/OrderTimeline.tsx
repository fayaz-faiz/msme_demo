"use client";

import type { OrderStatus } from "@/features/orders/domain/order";
import { ORDER_STATUS_STEPS } from "@/features/orders/domain/order";
import styles from "./OrderTimeline.module.css";

type OrderTimelineProps = {
  currentStatus: OrderStatus;
};

function getCurrentStepIndex(currentStatus: OrderStatus) {
  return ORDER_STATUS_STEPS.findIndex((step) => step.status === currentStatus);
}

export function OrderTimeline({ currentStatus }: OrderTimelineProps) {
  const currentStepIndex = getCurrentStepIndex(currentStatus);

  return (
    <ol className={styles.timeline}>
      {ORDER_STATUS_STEPS.map((step, index) => {
        const isComplete = index < currentStepIndex;
        const isCurrent = index === currentStepIndex;

        return (
          <li
            key={step.status}
            className={`${styles.step} ${isComplete ? styles.complete : ""} ${isCurrent ? styles.current : ""}`}
          >
            <span className={styles.marker} aria-hidden="true" />
            <div className={styles.stepBody}>
              <strong>{step.label}</strong>
              <span>
                {isComplete
                  ? "Completed"
                  : isCurrent
                    ? "In progress"
                    : "Pending"}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
