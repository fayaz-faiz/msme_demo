"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { clearCart } from "@/features/cart/store/cartSlice";
import { useAppDispatch, useAppSelector } from "@/features/cart/store/hooks";
import { useLocation } from "@/features/location/context/location-context";
import { recordOrder } from "@/features/orders/store/ordersSlice";
import { formatCurrency } from "@/shared/lib/format-currency";
import styles from "./page.module.css";

export default function CheckoutPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const isHydrated = useAppSelector((state) => state.auth.isHydrated);
  const items = useAppSelector((state) => state.cart.items);
  const { location } = useLocation();
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (!isHydrated) {
    return null;
  }

  if (!user) {
    return (
      <section className={styles.page}>
        <div className={styles.card}>
          <p className={styles.kicker}>Login required</p>
          <h1>Sign in to continue checkout</h1>
          <p>We need a logged-in user before placing an order.</p>
          <Link href="/auth/login?next=/checkout" className={styles.primaryButton}>
            Login Now
          </Link>
        </div>
      </section>
    );
  }

  if (!items.length) {
    return (
      <section className={styles.page}>
        <div className={styles.card}>
          <p className={styles.kicker}>Cart empty</p>
          <h1>Add items before checkout</h1>
          <p>We could not find any products in your cart. Browse the stores and try again.</p>
          <Link href="/#shops" className={styles.primaryButton}>
            Browse Shops
          </Link>
        </div>
      </section>
    );
  }

  const handlePlaceOrder = () => {
    if (!items.length || isPlacingOrder) {
      return;
    }

    setIsPlacingOrder(true);
    timeoutRef.current = window.setTimeout(() => {
      const orderId = window.crypto?.randomUUID?.() ?? `order-${Date.now()}`;
      const deliveryAddress = location
        ? `${location.label}, ${location.city} - ${location.pincode}`
        : "Selected location from your header picker";

      dispatch(
        recordOrder({
          id: orderId,
          customerName: user.name,
          mobileNumber: user.mobileNumber,
          deliveryAddress,
          items,
          subtotal: total,
          status: "placed",
          paymentStatus: "pending",
          createdAt: new Date().toISOString(),
        }),
      );
      dispatch(clearCart());
      setIsPlacingOrder(false);
      timeoutRef.current = null;
      router.push(`/payments/${orderId}`);
    }, 1100);
  };

  return (
    <section className={styles.page}>
      <div className={styles.hero}>
        <div>
          <p className={styles.kicker}>Checkout</p>
          <h1>Ready to place your order, {user.name}?</h1>
          <p>Review the cart summary and confirm the purchase. We will take you to Razorpay payment next.</p>
        </div>
        <div className={styles.badgeRow}>
          <span>{items.length} items</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </div>

      <div className={styles.grid}>
        <section className={styles.card}>
          <h2>Delivery Address</h2>
          <p>Use the selected location from the navbar and update it any time.</p>
          <div className={styles.addressBox}>
            <strong>Saved Address</strong>
            <span>
              {location ? `${location.label}, ${location.city} - ${location.pincode}` : "Selected location from your header picker"}
            </span>
          </div>
        </section>

        <section className={styles.card}>
          <h2>Order Summary</h2>
          <div className={styles.summaryList}>
            {items.map((item) => (
              <div key={item.productId} className={styles.summaryRow}>
                <span>
                  {item.name} x {item.quantity}
                </span>
                <strong>{formatCurrency(item.price * item.quantity)}</strong>
              </div>
            ))}
          </div>
          <div className={styles.totalRow}>
            <span>Total</span>
            <strong>{formatCurrency(total)}</strong>
          </div>
          <button
            type="button"
            className={styles.checkoutButton}
            onClick={handlePlaceOrder}
            disabled={isPlacingOrder || !items.length}
          >
            {isPlacingOrder ? "Placing Order..." : "Place Order & Pay"}
          </button>
        </section>
      </div>
    </section>
  );
}

