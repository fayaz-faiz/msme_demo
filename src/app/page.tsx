import { ShopBrowser } from "@/features/shop/components/ShopBrowser";
import { AppFooter } from "@/shared/ui/AppFooter";
import { PreventBackNavigation } from "@/shared/ui/PreventBackNavigation";
import styles from "./page.module.css";

export default function HomePage() {
  return (
    <div className={styles.page}>
      <PreventBackNavigation />
      {/* <section className={styles.hero}>
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
            Live now
          </div>
          <div className={styles.heroStatusPill} aria-hidden="true">
            Delivery slots open in your area
          </div>
        </div> 
      </section> */}

      <section className={styles.hero}>
        <div className={styles.glowA} aria-hidden="true" />
        <div className={styles.glowB} aria-hidden="true" />
        <div className={styles.heroText}>
          <p className={styles.kicker}>Small shops, big impact</p>
          <h1>Empowering Your Neighborhood Economy</h1>
          <p>
            Every order helps a local family, a nearby kitchen, and the small businesses that keep
            your city moving every day.
          </p>
          <div className={styles.featurePills}>
            <span>Local support</span>
            <span>Fast delivery</span>
            <span>Trusted stores</span>
          </div>
        </div>
        <div className={styles.promoImageWrap}>
          <img
            src="https://img-cdn.publive.online/fit-in/640x430/filters:format(webp)/english-betterindia/media/post_attachments/uploads/2021/02/Vaibhav-1.jpg"
            alt="Neighborhood small shop"
            className={styles.promoImage}
          />
        </div>
        
      </section>

      <section id="shops">
        <ShopBrowser />
      </section>
      {/* <AppFooter /> */}
    </div>
  );
}
