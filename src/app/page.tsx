/* eslint-disable @next/next/no-img-element */

import { ShopBrowser } from "@/features/shop/components/ShopBrowser";
import { AppFooter } from "@/shared/ui/AppFooter";
import styles from "./page.module.css";

const heroImages = [
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=80",
];

export default function HomePage() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroText}>
          <h1>Discover The Best Food & Grocery Near You</h1>
          <p>
            Fast delivery from your favorite restaurants and trusted local stores, all in one place.
          </p>
          <div className={styles.featurePills}>
            <span>Top rated stores</span>
            <span>Fast delivery</span>
            <span>Local favorites</span>
          </div>
        </div>
        <div className={styles.heroArt}>
          <div className={styles.heroCarousel} aria-hidden="true">
            {heroImages.map((image, index) => (
              <img
                key={image}
                src={image}
                alt=""
                loading={index === 0 ? "eager" : "lazy"}
                decoding="async"
                className={styles.heroImage}
              />
            ))}
          </div>
          <div className={styles.heroCard}>
            <h3>Lightning Delivery</h3>
            <p>Average delivery time this week: 24 minutes</p>
          </div>
        </div>
      </section>

      <ShopBrowser />
      <AppFooter />
    </div>
  );
}
