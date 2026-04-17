"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { clearCart, decreaseQuantity, increaseQuantity, removeItem } from "@/features/cart/store/cartSlice";
import { useAppDispatch, useAppSelector } from "@/features/cart/store/hooks";
import { formatCurrency } from "@/shared/lib/format-currency";
import styles from "./CartSummary.module.css";

export function CartSummary() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const items = useAppSelector((state) => state.cart.items);
  const user = useAppSelector((state) => state.auth.user);
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  if (!items.length) {
    return (
      <section className={styles.emptyState}>
        <h2>Your cart is empty</h2>
        <p>Browse shops and add delicious items to start building your order.</p>
        <Link href="/#shops" className={styles.shopLink}>
          Explore Shops
        </Link>
      </section>
    );
  }

  return (
    <section className={styles.layout}>
      <div className={styles.itemsPanel}>
        <div className={styles.panelHeader}>
          <div>
            <p className={styles.kicker}>Order summary</p>
            <h2>{itemCount} items in cart</h2>
          </div>
          <button type="button" className={styles.clearButton} onClick={() => dispatch(clearCart())}>
            Clear Cart
          </button>
        </div>

        <div className={styles.list}>
          {items.map((item) => (
            <article key={item.productId} className={styles.itemCard}>
              <img src={item.image} alt={item.name} className={styles.itemImage} loading="lazy" decoding="async" />
              <div className={styles.itemBody}>
                <div className={styles.itemTop}>
                  <div>
                    <h3>{item.name}</h3>
                    <p>{formatCurrency(item.price)}</p>
                  </div>
                  <button
                    type="button"
                    className={styles.removeButton}
                    onClick={() => dispatch(removeItem({ productId: item.productId }))}
                  >
                    Remove
                  </button>
                </div>

                <div className={styles.itemFooter}>
                  <div className={styles.stepper}>
                    <button
                      type="button"
                      onClick={() => dispatch(decreaseQuantity({ productId: item.productId }))}
                    >
                      -
                    </button>
                    <span>{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => dispatch(increaseQuantity({ productId: item.productId }))}
                    >
                      +
                    </button>
                  </div>
                  <strong>{formatCurrency(item.price * item.quantity)}</strong>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      <aside className={styles.summaryPanel}>
        <div>
          <p className={styles.kicker}>Payment details</p>
          <h2>Total Price</h2>
        </div>
        <div className={styles.totalRow}>
          <span>Items</span>
          <span>{itemCount}</span>
        </div>
        <div className={styles.totalRow}>
          <span>Total</span>
          <strong>{formatCurrency(total)}</strong>
        </div>
        <button
          type="button"
          className={styles.checkoutButton}
          onClick={() => {
            if (!user) {
              router.push("/auth/login?next=/cart");
              return;
            }

            router.push("/checkout");
          }}
        >
          {user ? "View delivery options" : "Login To continue"}
        </button>
      </aside>
    </section>
  );
}
