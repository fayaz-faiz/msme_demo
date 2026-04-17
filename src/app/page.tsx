/* eslint-disable @next/next/no-img-element */

import { ShopBrowser } from "@/features/shop/components/ShopBrowser";
import { AppFooter } from "@/shared/ui/AppFooter";
import styles from "./page.module.css";

const heroSlides = [
  {
    title: "Breakfast Rush",
    subtitle: "Fresh picks from nearby kitchens in minutes.",
    image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1400&q=80",
  },
  {
    title: "Grocery Refill",
    subtitle: "Daily essentials with better local prices.",
    image: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1400&q=80",
  },
  {
    title: "Dinner Plans",
    subtitle: "Top-rated meals from your favorite stores.",
    image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1400&q=80",
  },
  {
    title: "Weekend Treats",
    subtitle: "New arrivals and chef specials near you.",
    image: "https://images.unsplash.com/photo-1520201163981-8cc95007dd2a?auto=format&fit=crop&w=1400&q=80",
  },
];

export default function HomePage() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.glowA} aria-hidden="true" />
        <div className={styles.glowB} aria-hidden="true" />
        <div className={styles.heroText}>
          <p className={styles.kicker}>Your Local Delivery Dashboard</p>
          <h1>Discover The Best Food & Grocery Near You</h1>
          <p>
            One smooth experience for food, groceries, and neighborhood favorites, tailored to your location in real time.
          </p>
          <div className={styles.featurePills}>
            <span>Live store availability</span>
            <span>Fast checkout flow</span>
            <span>Top local ratings</span>
          </div>
          <div className={styles.heroStats}>
            <article>
              <strong>24 mins</strong>
              <span>Avg. delivery</span>
            </article>
            <article>
              <strong>350+</strong>
              <span>Partner stores</span>
            </article>
            <article>
              <strong>4.8/5</strong>
              <span>Customer rating</span>
            </article>
          </div>
        </div>
        <div className={styles.heroArt}>
          <div className={styles.heroCarousel} aria-hidden="true">
            {heroSlides.map((slide, index) => (
              <img
                key={slide.image}
                src={slide.image}
                alt=""
                loading={index === 0 ? "eager" : "lazy"}
                decoding="async"
                className={styles.heroImage}
              />
            ))}
          </div>
          <div className={styles.carouselOverlay}>
            {heroSlides.map((slide) => (
              <article key={slide.title} className={styles.heroCard}>
                <h3>{slide.title}</h3>
                <p>{slide.subtitle}</p>
              </article>
            ))}
          </div>
          <div className={styles.carouselSteps} aria-hidden="true">
            {heroSlides.map((slide) => (
              <span key={`${slide.title}-step`} className={styles.stepBar} />
            ))}
          </div>
          <div className={styles.floatingTag} aria-hidden="true">
            Trending near you
          </div>
        </div>
      </section>

      <section id="shops">
        <ShopBrowser />
      </section>
      <AppFooter />
    </div>
  );
}
