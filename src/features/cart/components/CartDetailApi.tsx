"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getCartLengthWeb, postAddUpdateCart, postCartByIdWeb, verifyCartWeb } from "@/api";
import { useLocation } from "@/features/location/context/location-context";
import { useAppDispatch } from "@/features/cart/store/hooks";
import { setCartLength } from "@/redux/slices";
import { formatCurrency } from "@/shared/lib/format-currency";
import styles from "./CartDetailApi.module.css";

type CartDetailApiProps = {
  cartId: string;
};

type CartItem = {
  ce_item_id: string;
  item_name?: string;
  item_symbol?: string;
  item_quantity?: string;
  count: number;
  total_amount?: number;
  original_amount?: number;
  item_returnable_status?: boolean;
  item_cancellable_status?: boolean;
};

type StoreData = {
  provider_name?: string;
  provider_symbol?: string;
  provider_address?: {
    street?: string;
    area_code?: string;
  };
  category?: string;
  total_amount?: number;
  other_charges?: Array<{ title?: string; amount?: number }>;
  items?: CartItem[];
};

export function CartDetailApi({ cartId }: CartDetailApiProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { location } = useLocation();
  const [loading, setLoading] = useState(false);
  const [storeData, setStoreData] = useState<StoreData | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [error, setError] = useState("");
  const [activeItemId, setActiveItemId] = useState("");

  const syncCartLength = async () => {
    try {
      const result: any = await getCartLengthWeb();
      dispatch(setCartLength(Number(result?.data?.data ?? 0)));
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCartDetails = async () => {
    if (!cartId) {
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response: any = await postCartByIdWeb({ cart_id: cartId });
      const ok = response?.data?.status;
      const responseData = response?.data?.data;
      if (ok && responseData) {
        const nextItems = responseData.items || [];
        setStoreData(responseData);
        setCartItems(nextItems);
        if (nextItems.length === 0) {
          router.replace("/cart");
        }
      } else {
        setStoreData(null);
        setCartItems([]);
        setError(response?.data?.message || "Cart is empty.");
        router.replace("/cart");
      }
    } catch (err: any) {
      console.error(err);
      setStoreData(null);
      setCartItems([]);
      setError(err?.response?.data?.message || "Unable to load cart details.");
    } finally {
      setLoading(false);
    }
  };

  const verifyCart = async () => {
    if (!cartId) {
      return;
    }
    setLoading(true);
    setError("");
    try {
      const gps = `${location?.lat ?? ""},${location?.lng ?? ""}`;
      const payload = {
        cart_id: cartId,
        gps,
        area_code: location?.pincode || "",
        paymentType: "ON-ORDER",
      };
      const response: any = await verifyCartWeb(payload);
      if (response?.data?.status) {
        await fetchCartDetails();
      } else {
        setError(response?.data?.data?.message || response?.data?.message || "Cart verification failed.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.message || "Cart verification failed.");
    } finally {
      setLoading(false);
    }
  };

  const updateItemCount = async (item: CartItem, nextCount: number) => {
    setActiveItemId(item.ce_item_id);
    try {
      const payload = {
        ce_item_id: item.ce_item_id,
        count: Math.max(0, nextCount),
        paymentType: "ON-ORDER",
        gps: `${location?.lat ?? ""},${location?.lng ?? ""}`,
        area_code: storeData?.provider_address?.area_code || location?.pincode || "",
        dest_location: "SEARCH",
        customization: {},
      };
      const result: any = await postAddUpdateCart(payload);
      const ok = !!result?.data?.status;
      if (!ok) {
        window.alert(result?.data?.data?.message || "Unable to update cart item.");
      }
      await verifyCart();
      await syncCartLength();
    } catch (err: any) {
      console.error(err);
      window.alert(err?.response?.data?.message || "Unable to update cart item.");
    } finally {
      setActiveItemId("");
    }
  };

  useEffect(() => {
    void verifyCart();
    void syncCartLength();
  }, [cartId, location?.lat, location?.lng, location?.pincode]);

  if (!cartId) {
    return (
      <section className={styles.emptyState}>
        <h2>No cart selected</h2>
        <p>Please choose a cart from the multi-cart list.</p>
        <Link href="/cart" className={styles.backButton}>
          Back to carts
        </Link>
      </section>
    );
  }

  if (loading && cartItems.length === 0) {
    return (
      <section className={styles.emptyState}>
        <p>Loading cart details...</p>
      </section>
    );
  }

  if (error && cartItems.length === 0) {
    return (
      <section className={styles.emptyState}>
        <h2>Unable to load cart</h2>
        <p>{error}</p>
        <Link href="/cart" className={styles.backButton}>
          Back to carts
        </Link>
      </section>
    );
  }

  const total = Number(storeData?.total_amount || 0);

  return (
    <section className={styles.layout}>
      <div className={styles.leftPanel}>
        <div className={styles.storeHeader}>
          <img
            src={storeData?.provider_symbol || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80"}
            alt={storeData?.provider_name || "Store"}
          />
          <div>
            <h2>{storeData?.provider_name || "Store"}</h2>
            <p>{storeData?.provider_address?.street || "-"}</p>
          </div>
        </div>

        <div className={styles.itemList}>
          {cartItems.map((item) => {
            const itemTotal = Number(item.total_amount || item.original_amount || 0);
            const rowLoading = activeItemId === item.ce_item_id;
            return (
              <article key={item.ce_item_id} className={styles.itemCard}>
                <img src={item.item_symbol || ""} alt={item.item_name || "Item"} />
                <div className={styles.itemBody}>
                  <h3>{item.item_name}</h3>
                  <p>{item.item_quantity}</p>
                  <div className={styles.itemMeta}>
                    <span>{item.item_returnable_status ? "Returnable" : "Non-Returnable"}</span>
                    <span>{item.item_cancellable_status ? "Cancellable" : "Non-Cancellable"}</span>
                  </div>
                  <div className={styles.itemFooter}>
                    <div className={styles.stepper}>
                      <button
                        type="button"
                        disabled={rowLoading}
                        onClick={() => updateItemCount(item, item.count - 1)}
                      >
                        -
                      </button>
                      <span>{rowLoading ? <span className={styles.rowLoader} /> : item.count}</span>
                      <button
                        type="button"
                        disabled={rowLoading}
                        onClick={() => updateItemCount(item, item.count + 1)}
                      >
                        +
                      </button>
                    </div>
                    <strong>{formatCurrency(itemTotal)}</strong>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <aside className={styles.summaryPanel}>
        <h3>Summary</h3>
        <div className={styles.summaryRow}>
          <span>Items</span>
          <span>{cartItems.length}</span>
        </div>
        <div className={styles.summaryRow}>
          <span>Total</span>
          <strong>{formatCurrency(total)}</strong>
        </div>
        <div className={styles.actions}>
          <Link href="/checkout" className={styles.checkoutButton}>
            Proceed to Checkout
          </Link>
          <Link href="/cart" className={styles.backButton}>
            Back to carts
          </Link>
        </div>
      </aside>
    </section>
  );
}
