/* eslint-disable @next/next/no-img-element */

import styles from "./AppFooter.module.css";

export function AppFooter() {
  return (
    <footer className={styles.footer}>
      <section className={styles.promo}>
        <div className={styles.promoCopy}>
          <p className={styles.promoKicker}>Small shops, big impact</p>
          <h2>Empowering Your Neighborhood Economy</h2>
          <p>
            Every order helps a local family, a nearby kitchen, and the small businesses that keep
            your city moving every day.
          </p>
          <p>
            We connect customers to trusted neighborhood stores so delivery feels personal,
            reliable, and fast, while keeping the experience simple and friendly.
          </p>
          <div className={styles.promoPills}>
            <span>Local support</span>
            <span>Fast delivery</span>
            <span>Trusted stores</span>
          </div>
        </div>
        <div className={styles.promoImageWrap}>
          <img
            src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80"
            alt="Neighborhood small shop"
            className={styles.promoImage}
          />
        </div>
      </section>
    </footer>
  );
}
