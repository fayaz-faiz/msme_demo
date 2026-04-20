"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCartLengthWeb, getMultiCrtData, postDeleteCart } from "@/api";
import { useAppDispatch } from "@/features/cart/store/hooks";
import { setCartLength } from "@/redux/slices";
import { notifyOrAlert } from "@/shared/lib/notify";
import styles from "./MultiCartList.module.css";

type MultiCartItem = {
  _id: string;
  provider_name?: string;
  provider_symbol?: string;
  provider_address?: {
    street?: string;
  };
  items?: unknown[];
  total_amount?: string | number;
};

export function MultiCartList() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);
  const [multicartData, setMulticartData] = useState<MultiCartItem[]>([]);
  const [dataAvailable, setDataAvailable] = useState(false);
  const [pendingDeleteCartId, setPendingDeleteCartId] = useState("");
  const [deletingCartId, setDeletingCartId] = useState("");

  const getCartLength = async () => {
    try {
      const result: any = await getCartLengthWeb();
      dispatch(setCartLength(Number(result?.data?.data ?? 0)));
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStoresData = async () => {
    setLoading(true);
    try {
      const response: any = await getMultiCrtData();
      const payload = response?.data;
      const message = payload?.message;
      const carts = (payload?.data || []) as MultiCartItem[];
      const isEmptyMessage = message === "Cart Is Empty";

      if (isEmptyMessage || !Array.isArray(carts) || carts.length === 0) {
        setDataAvailable(false);
        setMulticartData([]);
      } else {
        setMulticartData(carts);
        setDataAvailable(true);
      }
    } catch (err) {
      console.error(err);
      setDataAvailable(false);
      setMulticartData([]);
    } finally {
      setLoading(false);
    }
  };

  const deleteCart = async (cartId: string) => {
    setDeletingCartId(cartId);
    try {
      const payload = { cart_id: cartId };
      const response: any = await postDeleteCart(payload);
      const statusCode = response?.data?.statusCode;
      const ok =
        statusCode === 200 ||
        statusCode === 204 ||
        response?.data?.status === true;
      if (ok) {
        notifyOrAlert(
          response?.data?.message || "Cart deleted successfully.",
          "success",
        );
        await getCartLength();
        await fetchStoresData();
      } else {
        notifyOrAlert(
          response?.data?.message || "Unable to delete cart.",
          "error",
        );
      }
    } catch (err: any) {
      console.error(err);
      notifyOrAlert(
        err?.response?.data?.message ||
          "Something went wrong while deleting cart.",
        "error",
      );
    } finally {
      setDeletingCartId("");
      setPendingDeleteCartId("");
    }
  };

  const viewCart = (cartData: MultiCartItem) => {
    router.push(`/cart/view?cartId=${encodeURIComponent(cartData._id)}`);
  };

  useEffect(() => {
    void fetchStoresData();
    void getCartLength();
  }, []);

  if (loading) {
    return (
      <section className={styles.stateWrap}>
        <p>Loading carts...</p>
      </section>
    );
  }

  if (!dataAvailable) {
    return (
      <section className={styles.stateWrap}>
        <h2>Your cart is empty</h2>
      </section>
    );
  }

  return (
    <section className={styles.listWrap}>
      {multicartData.map((item) => (
        <article key={item._id} className={styles.card}>
          <div className={styles.left}>
            <img
              className={styles.providerImage}
              alt={item?.provider_name || "Provider"}
              src={
                item?.provider_symbol ||
                "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80"
              }
            />
            <div className={styles.details}>
              <h3>{item?.provider_name || "Store"}</h3>
              <p>{item?.provider_address?.street || "-"}</p>
              <p>
                {(item?.items?.length || 0) > 1
                  ? `+ ${(item?.items?.length || 0) - 1} items`
                  : ""}
              </p>
              <strong>
                Total: Rs. {Number(item?.total_amount || 0).toFixed(2)}
              </strong>
            </div>
          </div>

          <div className={styles.actions}>
            <button type="button" onClick={() => viewCart(item)}>
              View Cart
            </button>
            <button
              type="button"
              className={styles.deleteButton}
              onClick={() => setPendingDeleteCartId(item._id)}
              disabled={deletingCartId === item._id}
            >
              {deletingCartId === item._id ? "Deleting..." : "Delete Cart"}
            </button>
          </div>
        </article>
      ))}

      {pendingDeleteCartId ? (
        <div
          className={styles.modalBackdrop}
          role="presentation"
          onClick={() => setPendingDeleteCartId("")}
        >
          <div
            className={styles.modalCard}
            role="dialog"
            aria-modal="true"
            aria-label="Delete cart confirmation"
            onClick={(event) => event.stopPropagation()}
          >
            <h3>Remove this cart?</h3>
            <p>This action removes all items from this cart.</p>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={() => setPendingDeleteCartId("")}
                disabled={deletingCartId === pendingDeleteCartId}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.confirmDeleteButton}
                onClick={() => void deleteCart(pendingDeleteCartId)}
                disabled={deletingCartId === pendingDeleteCartId}
              >
                {deletingCartId === pendingDeleteCartId
                  ? "Deleting..."
                  : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
