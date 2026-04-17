"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { Shop } from "@/features/shop/domain/shop";
import styles from "./StoreShowcase.module.css";

type StoreShowcaseProps = {
  shops: Shop[];
};

const categoryImageMap: Record<string, string> = {
  Grocery:
    "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80",
  Fashion:
    "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=80",
  Coffee:
    "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80",
  Workspace:
    "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80",
  Indian:
    "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80",
  Healthy:
    "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80",
  Pizza:
    "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80",
  "Street Food":
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80",
  Dessert:
    "https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=800&q=80",
  Burgers:
    "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80",
  Japanese:
    "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=800&q=80",
  Bakery:
    "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80",
};

export function StoreShowcase({ shops }: StoreShowcaseProps) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All Stores");
  const [visibleCount, setVisibleCount] = useState(8);

  const categoryCards = useMemo(
    () => [
      {
        name: "All Stores",
        image:
          "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80",
      },
      ...Array.from(new Set(shops.map((shop) => shop.category))).map((name) => ({
        name,
        image:
          categoryImageMap[name] ??
          "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80",
      })),
    ],
    [shops],
  );

  const filteredShops = shops.filter((shop) => {
    const matchesCategory = activeCategory === "All Stores" || shop.category === activeCategory;
    const matchesQuery = [shop.name, shop.category, shop.description]
      .join(" ")
      .toLowerCase()
      .includes(query.trim().toLowerCase());

    return matchesCategory && matchesQuery;
  });

  useEffect(() => {
    setVisibleCount(8);
  }, [activeCategory, query]);

  const visibleShops = filteredShops.slice(0, visibleCount);

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <div>
          <p className={styles.kicker}>All stores</p>
          <h2>Browse nearby shops</h2>
          <p>Pick a category, search a store, and tap any card to open its item list.</p>
        </div>
        <div className={styles.countPills}>
          <span>{activeCategory}</span>
          <span>{filteredShops.length} stores</span>
          <span>{categoryCards.length - 1} categories</span>
        </div>
      </div>

      <div className={styles.categoryRail} aria-label="Store categories">
        {categoryCards.map((category) => (
          <button
            key={category.name}
            type="button"
            className={activeCategory === category.name ? styles.categoryActive : styles.categoryCard}
            onClick={() => {
              setActiveCategory(category.name);
              setVisibleCount(8);
            }}
          >
            <img src={category.image} alt={category.name} className={styles.categoryImage} />
            <span>{category.name}</span>
          </button>
        ))}
      </div>

      <div className={styles.toolbar}>
        <input
          type="search"
          placeholder="Search stores by name, cuisine, or category"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <button
          type="button"
          onClick={() => {
            setActiveCategory("All Stores");
            setQuery("");
          }}
        >
          Reset Filters
        </button>
      </div>

      <div className={styles.storeGrid}>
        {visibleShops.map((shop) => (
          <Link key={shop.id} href={`/shops/${shop.slug}`} className={styles.storeCard}>
            <div className={styles.storeImageWrap} style={{ "--accent": shop.accent } as CSSProperties}>
              <img
                src={shop.image}
                alt={shop.name}
                className={styles.storeImage}
                loading="lazy"
                decoding="async"
              />
              <div className={styles.overlay} />
              <span className={styles.badge}>{shop.category}</span>
            </div>
            <div className={styles.storeBody}>
              <div className={styles.titleRow}>
                <h3>{shop.name}</h3>
                <span>{shop.rating.toFixed(1)} ★</span>
              </div>
              <p>{shop.description}</p>
              <div className={styles.meta}>
                <span>{shop.deliveryTime}</span>
                <span>Open Store</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {filteredShops.length > visibleCount ? (
        <div className={styles.moreRow}>
          <button type="button" onClick={() => setVisibleCount(filteredShops.length)}>
            See All Stores
          </button>
        </div>
      ) : null}
    </section>
  );
}
