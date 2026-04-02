"use client";

import { useState } from "react";
import type { Product } from "@/features/product/domain/product";
import styles from "./ProductMeta.module.css";

type ProductFoodType = Product["foodType"];

type ProductTypeBadgeProps = {
  foodType?: ProductFoodType;
};

type ProductDescriptionPreviewProps = {
  description: string;
  hasVariants?: boolean;
  label?: string;
};

export function ProductTypeBadge({ foodType }: ProductTypeBadgeProps) {
  if (!foodType) {
    return null;
  }

  const isVeg = foodType === "veg";

  return (
    <span className={styles.badge} aria-label={isVeg ? "Veg product" : "Non-veg product"}>
      <span
        aria-hidden="true"
        className={`${styles.dot} ${isVeg ? styles.vegDot : styles.nonVegDot}`}
      />
      {isVeg ? "Veg" : "Non-veg"}
    </span>
  );
}

export function ProductDescriptionPreview({
  description,
  hasVariants,
  label = "More",
}: ProductDescriptionPreviewProps) {
  const [expanded, setExpanded] = useState(false);

  if (!hasVariants) {
    return <p className={styles.description}>{description}</p>;
  }

  return (
    <div className={styles.descriptionBlock}>
      <p className={`${styles.description} ${expanded ? styles.expanded : styles.clamped}`}>
        {description}
      </p>
      <div className={styles.descriptionFooter}>
        <span className={styles.variantHint}>Multiple variants available</span>
        <button
          type="button"
          className={styles.moreButton}
          aria-expanded={expanded}
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? "Less" : label}
        </button>
      </div>
    </div>
  );
}
