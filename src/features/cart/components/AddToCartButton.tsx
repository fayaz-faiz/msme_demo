"use client";

/* eslint-disable @next/next/no-img-element */

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getCartLengthWeb, postAddUpdateCart } from "@/api";
import { Product } from "@/features/product/domain/product";
import { addItem, decreaseQuantity, increaseQuantity, removeItem, setItemQuantity } from "@/features/cart/store/cartSlice";
import { useAppDispatch, useAppSelector } from "@/features/cart/store/hooks";
import { useLocation } from "@/features/location/context/location-context";
import { setCartLength } from "@/redux/slices";
import { notifyOrAlert } from "@/shared/lib/notify";
import { useState } from "react";
import styles from "./AddToCartButton.module.css";

type AddToCartButtonProps = {
  product: Product;
  useServerCart?: boolean;
};

export function AddToCartButton({ product, useServerCart = false }: AddToCartButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { location } = useLocation();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const loginName = useAppSelector((state) => state.authToken.loginName);
  const quantity = useAppSelector(
    (state) => state.cart.items.find((item) => item.productId === product.id)?.quantity ?? 0,
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const currentQuery = searchParams?.toString();
  const nextPath = currentQuery ? `${pathname}?${currentQuery}` : pathname;

  const syncCartLength = async () => {
    try {
      const result: any = await getCartLengthWeb();
      const cartLength = Number(result?.data?.data ?? 0);
      dispatch(setCartLength(cartLength));
    } catch (error) {
      console.error("getCartLength error:", error);
    }
  };

  const ensureLoggedIn = () => {
    if (user || loginName === "USER") {
      return true;
    }

    const allowRedirect = window.confirm("Please login first to add items and view cart. Go to login now?");
    if (allowRedirect) {
      router.push(`/auth/login?next=${encodeURIComponent(nextPath)}`);
    }
    return false;
  };

  const updateServerCart = async (nextCount: number): Promise<{ ok: boolean; itemCount: number }> => {
    try {
      const payload = {
        ce_item_id: product.id,
        count: nextCount,
        paymentType: "ON-ORDER",
        gps: `${location?.lat ?? ""},${location?.lng ?? ""}`,
        area_code: location?.pincode ?? "",
        dest_location: "SEARCH",
        customization: {},
      };

      const result: any = await postAddUpdateCart(payload);
      const ok = !!result?.data?.status;
      const itemCount = Number(result?.data?.data?.item_count ?? nextCount);
      if (ok) {
        await syncCartLength();
        return { ok: true, itemCount };
      }

      const message = result?.data?.data?.message || "Unable to update cart.";
      notifyOrAlert(message, "warning");
      return { ok: false, itemCount: Number.isFinite(itemCount) ? itemCount : 0 };
    } catch (error: any) {
      notifyOrAlert(error?.response?.data?.message || "Unable to update cart.", "error");
      return { ok: false, itemCount: 0 };
    }
  };

  if (!quantity) {
    return (
      <button
        type="button"
        className={styles.addButton}
        disabled={isUpdating}
        onClick={async () => {
          if (!ensureLoggedIn()) {
            return;
          }

          if (useServerCart) {
            setIsUpdating(true);
            const response = await updateServerCart(1);
            setIsUpdating(false);
            if (!response.ok) {
              return;
            }
            dispatch(setItemQuantity({ product, quantity: response.itemCount }));
            return;
          }

          dispatch(addItem(product));
        }}
      >
        {isUpdating ? "Adding..." : "Add To Cart"}
      </button>
    );
  }

  return (
    <div className={styles.stepper} aria-label={`${product.name} quantity controls`}>
      <button
        type="button"
        className={styles.stepButton}
        disabled={isUpdating}
        onClick={async () => {
          if (!ensureLoggedIn()) {
            return;
          }
          const nextCount = Math.max(0, quantity - 1);
          if (useServerCart) {
            if (nextCount === 0) {
              // Switch back to "Add To Cart" immediately when user decrements from 1.
              dispatch(removeItem({ productId: product.id }));
              void updateServerCart(0);
              return;
            }

            setIsUpdating(true);
            const response = await updateServerCart(nextCount);
            setIsUpdating(false);
            if (!response.ok) {
              return;
            }
            dispatch(setItemQuantity({ product, quantity: response.itemCount }));
            return;
          }
          if (nextCount === 0) {
            dispatch(removeItem({ productId: product.id }));
          } else {
            dispatch(decreaseQuantity({ productId: product.id }));
          }
        }}
        aria-label={`Decrease quantity of ${product.name}`}
      >
        -
      </button>
      <span className={styles.quantity}>{isUpdating ? <span className={styles.countLoader} /> : quantity}</span>
      <button
        type="button"
        className={styles.stepButton}
        disabled={isUpdating}
        onClick={async () => {
          if (!ensureLoggedIn()) {
            return;
          }
          const nextCount = quantity + 1;
          if (useServerCart) {
            setIsUpdating(true);
            const response = await updateServerCart(nextCount);
            setIsUpdating(false);
            if (!response.ok) {
              return;
            }
            dispatch(setItemQuantity({ product, quantity: response.itemCount }));
            return;
          }
          dispatch(increaseQuantity({ productId: product.id }));
        }}
        aria-label={`Increase quantity of ${product.name}`}
      >
        +
      </button>
    </div>
  );
}
