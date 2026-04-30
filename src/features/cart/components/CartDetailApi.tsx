"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getAddressWeb,
  getCartLengthWeb,
  initializeCartWeb,
  payemntGw,
  postCartByIdWeb,
  verifyCartWeb,
} from "@/api";
import { AddToCartButton } from "@/features/cart/components/AddToCartButton";
import { clearCart, setItemQuantity } from "@/features/cart/store/cartSlice";
import { useLocation } from "@/features/location/context/location-context";
import { useAppDispatch, useAppSelector } from "@/features/cart/store/hooks";
import { LocationPickerModal } from "@/features/location/components/LocationPickerModal";
import { Product } from "@/features/product/domain/product";
import { setCartLength } from "@/redux/slices";
import { formatCurrency } from "@/shared/lib/format-currency";
import { notifyOrAlert } from "@/shared/lib/notify";
import { BackButton } from "@/shared/ui/BackButton";
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
  original_amount?: number;
  total_amount?: number;
  grand_total?: number | string;
  other_charges?: Array<{
    title?: string;
    amount?: number;
    price?: { value?: string | number };
  }>;
  items?: CartItem[];
};

type AddressItem = {
  _id: string;
  building?: string;
  locality?: string;
  city?: string;
  state?: string;
  area_code?: string;
  country?: string;
  gps?: string;
};

function formatGpsCoord(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value) || value === 0) return "";
  return value.toFixed(6);
}

export function CartDetailApi({ cartId }: CartDetailApiProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { location } = useLocation();
  const selectedAddressFromRedux = useAppSelector(
    (state) => state.location.selectAddress as AddressItem | null,
  );
  const [loading, setLoading] = useState(false);
  const [isCartVerified, setIsCartVerified] = useState(false);
  const [storeData, setStoreData] = useState<StoreData | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [error, setError] = useState("");
  const [isInitializing, setIsInitializing] = useState(false);
  const [allAddress, setAllAddress] = useState<AddressItem[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showDeliveryOptions, setShowDeliveryOptions] = useState(false);
  const [showOrderPlacing, setShowOrderPlacing] = useState(false);
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [showStoreError, setShowStoreError] = useState(false);
  const [storeErrorMessage, setStoreErrorMessage] = useState("");

  const getErrorMessage = (value: any, fallback = "Something went wrong.") => {
    const message =
      value?.response?.data?.message ||
      value?.response?.data?.data?.message ||
      value?.message ||
      value?.data?.message ||
      value?.data?.data?.message ||
      fallback;
    return String(message).trim() || fallback;
  };

  const loadRazorpayScript = async () => {
    if (typeof window === "undefined") {
      return false;
    }
    if ((window as Window & { Razorpay?: unknown }).Razorpay) {
      return true;
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
    );
    if (existingScript) {
      if ((window as Window & { Razorpay?: unknown }).Razorpay) {
        return true;
      }
      await new Promise<void>((resolve, reject) => {
        const onLoad = () => resolve();
        const onError = () =>
          reject(new Error("Unable to load payment script."));
        existingScript.addEventListener("load", onLoad, { once: true });
        existingScript.addEventListener("error", onError, { once: true });
      });
      return !!(window as Window & { Razorpay?: unknown }).Razorpay;
    }

    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () =>
        reject(new Error("Unable to load payment script."));
      document.body.appendChild(script);
    });

    return !!(window as Window & { Razorpay?: unknown }).Razorpay;
  };

  const initiatePayment = async (
    amount: number | string,
    uniqueId?: string,
    orderId?: string,
  ) => {
    const loaded = await loadRazorpayScript();
    if (!loaded) {
      throw new Error(
        "Payment gateway could not be initialized. Please try again.",
      );
    }

    const razorpayKey =
      process.env.NEXT_PUBLIC_RAZORPAY_API_KEY ||
      process.env.REACT_APP_RAZORPAY_API_KEY;
    if (!razorpayKey) {
      throw new Error("Payment gateway key is missing.");
    }

    const options = {
      key: razorpayKey,
      amount: amount,
      currency: "INR",
      name: "Nearshop",
      description: "Order payment",
      notes: {
        uniqueId: uniqueId || "",
        orderId: orderId || "",
      },
      handler: () => {
        notifyOrAlert("Payment successful. Placing your order...", "success");
        dispatch(clearCart());
        dispatch(setCartLength(0));
        setCartItems([]);
        setShowDeliveryOptions(false);
        setShowOrderPlacing(true);
        setTimeout(() => {
          setShowOrderPlacing(false);
          router.push("/orders/latest");
        }, 3000);
      },
      modal: {
        ondismiss: () => {
          notifyOrAlert("Payment cancelled.", "warning");
        },
      },
      theme: {
        color: "#3399cc",
      },
    };

    const RazorpayConstructor = (
      window as Window & { Razorpay?: new (opts: any) => { open: () => void } }
    ).Razorpay;
    if (!RazorpayConstructor) {
      throw new Error("Payment gateway is unavailable right now.");
    }

    const razorpay = new RazorpayConstructor(options);
    razorpay.open();
  };

  const paymentGwApi = async () => {
    if (!cartId || isPaymentProcessing) {
      return;
    }

    setIsPaymentProcessing(true);
    try {
      const resp: any = await payemntGw({ cart_id: cartId });
      const responseData = resp?.data?.data;
      if (resp?.data?.status && responseData?.id) {
        await initiatePayment(
          responseData?.amount_due,
          responseData?.notes?.uniqueId,
          responseData?.id,
        );
        return;
      }

      const message = getErrorMessage(resp, "Unable to create payment order.");
      notifyOrAlert(message, "error");
    } catch (err: any) {
      const message = getErrorMessage(err, "Unable to create payment order.");
      notifyOrAlert(message, "error");
    } finally {
      setIsPaymentProcessing(false);
    }
  };

  const getActiveAddress = () => {
    if (selectedAddressId) {
      const fromList = allAddress.find(
        (entry) => entry._id === selectedAddressId,
      );
      if (fromList) {
        return fromList;
      }
    }
    if (selectedAddressFromRedux?._id) {
      return selectedAddressFromRedux;
    }
    return allAddress[0] || null;
  };

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
        const message = response?.data?.message || "Cart is empty.";
        setError(message);
        notifyOrAlert(message, "warning");
        router.replace("/cart");
      }
    } catch (err: any) {
      console.error(err);
      setStoreData(null);
      setCartItems([]);
      const message =
        err?.response?.data?.message || "Unable to load cart details.";
      setError(message);
      notifyOrAlert(message, "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchAddresses = async () => {
    try {
      const response: any = await getAddressWeb();
      const payload = response?.data?.data;
      const incoming = (
        Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.data)
            ? payload.data
            : Array.isArray(response?.data?.message)
              ? response.data.message
              : []
      ) as AddressItem[];
      if (Array.isArray(incoming)) {
        setAllAddress(incoming);
        if (selectedAddressFromRedux?._id) {
          setSelectedAddressId(selectedAddressFromRedux._id);
        } else if (incoming[0]?._id) {
          setSelectedAddressId(incoming[0]._id);
        }
      }
    } catch (err) {
      console.error("getAddressWeb error:", err);
    }
  };

  const verifyCart = async () => {
    if (!cartId) {
      return false;
    }
    setLoading(true);
    setIsCartVerified(false);
    setError("");
    try {
      const activeAddress = getActiveAddress();
      const lat = formatGpsCoord(location?.lat);
      const lng = formatGpsCoord(location?.lng);
      const gps = activeAddress?.gps || (lat && lng ? `${lat},${lng}` : "");
      const payload = {
        cart_id: cartId,
        gps,
        area_code: activeAddress?.area_code || location?.pincode || "",
        paymentType: "ON-ORDER",
      };
      const response: any = await verifyCartWeb(payload);
      const statusCode = response?.data?.statusCode;
      console.log("verifyCart response:", statusCode);
      if (response?.data?.status) {
        setIsCartVerified(true);
        await fetchCartDetails();
        return true;
      } else {
        const message =
          response?.data?.data?.message ||
          response?.data?.message ||
          "Cart verification failed.";
        if (statusCode === 406 || statusCode === 504) {
          setStoreErrorMessage(message);
          setShowStoreError(true);
          return false;
        }
        if (statusCode === 501) {
          notifyOrAlert("Cart updated successfully.", "success");
          router.back();
          return false;
        }
        const isLocationError =
          statusCode === 404 ||
          /far from the store|different address/i.test(message);
        if (isLocationError) {
          notifyOrAlert(message, "warning");
          setTimeout(() => setShowLocationPicker(true), 5000);
        } else {
          setError(message);
          notifyOrAlert(message, "warning");
        }
        return false;
      }
    } catch (err: any) {
      console.error(err);
      const message =
        err?.response?.data?.data?.message ||
        err?.response?.data?.message ||
        "Cart verification failed.";
      setError(message);
      notifyOrAlert(message, "warning");
      if (
        err?.response?.status === 404 ||
        /far from the store|different address/i.test(message)
      ) {
        setShowLocationPicker(true);
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleViewDeliveryOptions = async () => {
    if (!cartId || cartItems.length === 0 || isInitializing) {
      return;
    }
    const activeAddress = getActiveAddress();
    if (!activeAddress?._id) {
      setShowLocationPicker(true);
      return;
    }

    setIsInitializing(true);
    try {
      const payload = {
        cart_id: cartId,
        billing_address_id: activeAddress._id,
        shipping_address_id: activeAddress._id,
      };

      const initResponse: any = await initializeCartWeb(payload);
      if (!initResponse?.data?.status) {
        notifyOrAlert(
          initResponse?.data?.data?.message ||
            initResponse?.data?.message ||
            "Unable to initialize cart.",
          "warning",
        );
        return;
      }
      setShowDeliveryOptions(true);
    } catch (err: any) {
      console.error(err);
      notifyOrAlert(
        err?.response?.data?.message || "Unable to initialize cart.",
        "error",
      );
    } finally {
      setIsInitializing(false);
    }
  };

  const toProduct = (item: CartItem): Product => ({
    id: item.ce_item_id,
    slug: item.ce_item_id,
    shopSlug: storeData?.provider_name || "",
    name: item.item_name || "Item",
    description: item.item_quantity || "",
    price: Number(item.total_amount || item.original_amount || 0),
    stock: 999,
    image: item.item_symbol || "",
  });

  useEffect(() => {
    cartItems.forEach((item) => {
      dispatch(
        setItemQuantity({ product: toProduct(item), quantity: item.count }),
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartItems]);

  useEffect(() => {
    void verifyCart();
    void syncCartLength();
    void fetchAddresses();
  }, [cartId, location?.lat, location?.lng, location?.pincode]);

  useEffect(() => {
    if (selectedAddressFromRedux?._id) {
      setSelectedAddressId(selectedAddressFromRedux._id);
    }
  }, [selectedAddressFromRedux?._id]);

  const baseTotal = Number(
    storeData?.original_amount ?? storeData?.total_amount ?? 0,
  );
  const extraCharges = (storeData?.other_charges || []).reduce(
    (sum, charge) => {
      const amount = Number(charge?.amount ?? charge?.price?.value ?? 0);
      return sum + (Number.isFinite(amount) ? amount : 0);
    },
    0,
  );
  const computedPayTotal = baseTotal + extraCharges;
  const payTotal = Number(storeData?.grand_total ?? computedPayTotal);
  const payTotalDisplay = formatCurrency(payTotal);

  if (!cartId) {
    return (
      <section className={styles.emptyState}>
        <h2>No cart selected</h2>
        <p>Please choose a cart from the multi-cart list.</p>
        <Link href="/cart" className={styles.backButton}>
          ← Back to carts
        </Link>
      </section>
    );
  }

  if (loading && cartItems.length === 0) {
    return (
      <div className={styles.skeletonLayout}>
        {/* Left skeleton */}
        <div className={styles.skeletonLeft}>
          {/* Store card */}
          <div className={styles.skeletonStoreCard}>
            <div
              className={`${styles.skeletonBase} ${styles.skeletonStoreImg}`}
            />
            <div className={styles.skeletonStoreBody}>
              <div
                className={`${styles.skeletonBase} ${styles.skeletonLine}`}
                style={{ width: "55%" }}
              />
              <div
                className={`${styles.skeletonBase} ${styles.skeletonLineSm}`}
                style={{ width: "40%" }}
              />
            </div>
          </div>

          {/* Items card */}
          <div className={styles.skeletonItemsCard}>
            {[1, 2, 3].map((i) => (
              <div key={i} className={styles.skeletonItem}>
                <div
                  className={`${styles.skeletonBase} ${styles.skeletonThumb}`}
                />
                <div className={styles.skeletonBody}>
                  <div
                    className={`${styles.skeletonBase} ${styles.skeletonLine}`}
                    style={{ width: "70%" }}
                  />
                  <div
                    className={`${styles.skeletonBase} ${styles.skeletonLineSm}`}
                    style={{ width: "45%" }}
                  />
                  <div
                    className={`${styles.skeletonBase} ${styles.skeletonLineSm}`}
                    style={{ width: "35%" }}
                  />
                  <div
                    className={`${styles.skeletonBase} ${styles.skeletonBtn}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right skeleton */}
        <div className={styles.skeletonRight}>
          <div className={styles.skeletonSummaryCard}>
            <div
              className={`${styles.skeletonBase} ${styles.skeletonLine}`}
              style={{ width: "45%" }}
            />
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "1rem",
                }}
              >
                <div
                  className={`${styles.skeletonBase} ${styles.skeletonLineSm}`}
                  style={{ width: "40%" }}
                />
                <div
                  className={`${styles.skeletonBase} ${styles.skeletonLineSm}`}
                  style={{ width: "25%" }}
                />
              </div>
            ))}
          </div>
          <div className={styles.skeletonCtaCard}>
            <div
              className={`${styles.skeletonBase} ${styles.skeletonCtaBtn}`}
            />
            <div
              className={`${styles.skeletonBase} ${styles.skeletonCtaBtn}`}
              style={{ opacity: 0.5 }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (error && cartItems.length === 0) {
    return (
      <section className={styles.emptyState}>
        <span className={styles.emptyIcon}>🛒</span>
        <h2>Unable to load cart</h2>
        <p>{error}</p>
        <Link href="/cart" className={styles.backButton}>
          ← Back to carts
        </Link>
      </section>
    );
  }

  const activeAddr = getActiveAddress();
  const addrText = activeAddr
    ? [
        activeAddr.building,
        activeAddr.locality,
        activeAddr.city,
        activeAddr.state,
        activeAddr.area_code,
      ]
        .filter(Boolean)
        .join(", ")
    : "";
  const needsAddress = isCartVerified && !addrText;

  return (
    <>
      <div className={styles.pageBack}>
        <BackButton href="/cart" />
      </div>
      <div className={styles.layout}>
        {/* ── Left panel ── */}
        <div className={styles.leftPanel}>
          {/* Store header */}
          <div className={styles.storeHeader}>
            <img
              className={styles.storeImg}
              src={
                storeData?.provider_symbol ||
                "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80"
              }
              alt={storeData?.provider_name || "Store"}
            />
            <div className={styles.storeInfo}>
              <p className={styles.storeName}>
                {storeData?.provider_name || "Store"}
              </p>
              <p className={styles.storeAddress}>
                {storeData?.provider_address?.street || "-"}
              </p>
            </div>
            <span className={styles.itemCount}>
              {cartItems.length} {cartItems.length === 1 ? "item" : "items"}
            </span>
          </div>

          {/* Items */}
          <div className={styles.itemsCard}>
            <p className={styles.itemsCardHeader}>Your order</p>
            <div className={styles.itemList}>
              {cartItems.map((item) => {
                const itemTotal = Number(
                  item.total_amount || item.original_amount || 0,
                );
                return (
                  <article key={item.ce_item_id} className={styles.itemCard}>
                    <img
                      className={styles.itemThumb}
                      src={
                        item.item_symbol ||
                        "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=200&q=60"
                      }
                      alt={item.item_name || "Item"}
                    />
                    <div className={styles.itemBody}>
                      <p className={styles.itemName}>{item.item_name}</p>
                      {item.item_quantity ? (
                        <p className={styles.itemQty}>{item.item_quantity}</p>
                      ) : null}
                      <div className={styles.itemBadges}>
                        <span className={styles.badge}>
                          {item.item_returnable_status
                            ? "Returnable"
                            : "Non-Returnable"}
                        </span>
                        <span className={styles.badge}>
                          {item.item_cancellable_status
                            ? "Cancellable"
                            : "Non-Cancellable"}
                        </span>
                      </div>
                      <div className={styles.itemFooter}>
                        <span className={styles.itemPrice}>
                          {formatCurrency(itemTotal)}
                        </span>
                        <AddToCartButton
                          product={toProduct(item)}
                          useServerCart
                          storeDisabled={false}
                          onCartUpdated={verifyCart}
                        />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Right panel ── */}
        <aside className={styles.summaryPanel}>
          {/* Delivery address */}
          <div
            className={`${styles.addressCard} ${needsAddress ? styles.addressCardAttention : ""}`}
          >
            <div className={styles.addressHead}>
              <span className={styles.addressLabel}>Delivery address</span>
              {addrText && (
                <button
                  type="button"
                  className={styles.changeAddressButton}
                  onClick={() => setShowLocationPicker(true)}
                >
                  Change
                </button>
              )}
            </div>
            {addrText ? (
              <p className={styles.addressText}>{addrText}</p>
            ) : needsAddress ? (
              <div className={styles.noAddressPrompt}>
                <div className={styles.noAddressPinWrap}>
                  <span className={styles.noAddressPinRing} />
                  <span
                    className={`${styles.noAddressPinRing} ${styles.noAddressPinRing2}`}
                  />
                  <svg
                    className={styles.noAddressPinIcon}
                    viewBox="0 0 24 24"
                    width="22"
                    height="22"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                  </svg>
                </div>
                <p className={styles.noAddressHint}>
                  Select an address to place your order
                </p>
                <button
                  type="button"
                  className={styles.noAddressCta}
                  onClick={() => setShowLocationPicker(true)}
                >
                  Select delivery address
                </button>
              </div>
            ) : (
              <button
                type="button"
                className={styles.noAddressButton}
                onClick={() => setShowLocationPicker(true)}
              >
                Select a delivery address
              </button>
            )}
          </div>

          {/* Bill details */}
          <div className={styles.summaryCard}>
            <p className={styles.summaryTitle}>Bill details</p>
            <div className={styles.billRow}>
              <span className={styles.billLabel}>Item total</span>
              <span className={styles.billValue}>
                {formatCurrency(baseTotal)}
              </span>
            </div>
            {(storeData?.other_charges || []).map((charge) => (
              <div
                key={`${charge.title}-${charge.amount}`}
                className={styles.billRow}
              >
                <span className={styles.billLabel}>
                  {charge.title || "Other charges"}
                </span>
                <span className={styles.billValue}>
                  {formatCurrency(
                    Number(charge?.amount ?? charge?.price?.value ?? 0),
                  )}
                </span>
              </div>
            ))}
            <div className={`${styles.billRow} ${styles.billTotal}`}>
              <span>To pay</span>
              <span>{payTotalDisplay}</span>
            </div>
          </div>

          {/* CTAs */}
          <div className={styles.ctaCard}>
            <button
              type="button"
              className={`${styles.checkoutButton} ${loading && !isCartVerified ? styles.checkoutButtonVerifying : ""}`}
              onClick={handleViewDeliveryOptions}
              disabled={
                !isCartVerified ||
                isInitializing ||
                loading ||
                cartItems.length === 0 ||
                !activeAddr
              }
            >
              {loading && !isCartVerified ? (
                <>
                  Verifying cart&nbsp;
                  <span className={styles.verifyingDots}>
                    <span />
                    <span />
                    <span />
                  </span>
                </>
              ) : isInitializing ? (
                "Preparing order..."
              ) : (
                `Proceed to checkout · ${payTotalDisplay}`
              )}
            </button>
            {/* <Link href="/cart" className={styles.backButton}>
            ← Back to carts
          </Link> */}
          </div>
        </aside>

        <LocationPickerModal
          open={showLocationPicker}
          onClose={() => setShowLocationPicker(false)}
          onAddressSelected={(addressId) => setSelectedAddressId(addressId)}
        />

        {/* Delivery options modal */}
        {showDeliveryOptions ? (
          <div
            className={styles.modalBackdrop}
            role="presentation"
            onClick={() => setShowDeliveryOptions(false)}
          >
            <div
              className={styles.modalCard}
              role="dialog"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.modalDrag} />
              <p className={styles.modalTitle}>Review & Pay</p>
              <p className={styles.modalSubtext}>
                Delivery is managed by the store.
              </p>
              <div className={styles.priceRows}>
                <div className={styles.billRow}>
                  <span className={styles.billLabel}>Item total</span>
                  <span className={styles.billValue}>
                    {formatCurrency(baseTotal)}
                  </span>
                </div>
                {(storeData?.other_charges || []).map((charge) => (
                  <div
                    key={`${charge.title}-${charge.amount}`}
                    className={styles.billRow}
                  >
                    <span className={styles.billLabel}>
                      {charge.title || "Other charges"}
                    </span>
                    <span className={styles.billValue}>
                      {formatCurrency(
                        Number(charge?.amount ?? charge?.price?.value ?? 0),
                      )}
                    </span>
                  </div>
                ))}
                <div className={`${styles.billRow} ${styles.billTotal}`}>
                  <span>Total to pay</span>
                  <span>{payTotalDisplay}</span>
                </div>
              </div>
              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.backButton}
                  onClick={() => setShowDeliveryOptions(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={styles.checkoutButton}
                  onClick={paymentGwApi}
                  disabled={isPaymentProcessing}
                >
                  {isPaymentProcessing
                    ? "Processing..."
                    : `Pay ${payTotalDisplay}`}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {/* 406 Store error bottom sheet */}
        {showStoreError ? (
          <div
            className={styles.modalBackdrop}
            role="presentation"
            onClick={() => setShowStoreError(false)}
          >
            <div
              className={`${styles.modalCard} ${styles.storeErrorSheet}`}
              role="dialog"
              aria-modal="true"
              aria-labelledby="storeErrorTitle"
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.modalDrag} />
              <div className={styles.storeErrorBody}>
                <div className={styles.storeErrorIconWrap}>
                  <svg
                    viewBox="0 0 48 48"
                    fill="none"
                    className={styles.storeErrorIcon}
                    aria-hidden="true"
                  >
                    <circle cx="24" cy="24" r="24" fill="#FFF3E0" />
                    <path
                      d="M24 14v14"
                      stroke="#FC8019"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                    <circle cx="24" cy="34" r="2" fill="#FC8019" />
                  </svg>
                </div>
                <p id="storeErrorTitle" className={styles.storeErrorTitle}>
                  {storeErrorMessage || "Something went wrong with this store."}
                </p>
                <p className={styles.storeErrorSub}>
                  Please try again or choose a different seller.
                </p>
              </div>
              <div className={styles.storeErrorActions}>
                <button
                  type="button"
                  className={styles.checkoutButton}
                  onClick={async () => {
                    setShowStoreError(false);
                    await verifyCart();
                  }}
                >
                  Try Again
                </button>
                <button
                  type="button"
                  className={styles.otherSellerButton}
                  onClick={() => {
                    setShowStoreError(false);
                    router.push("/cart");
                  }}
                >
                  Check with other sellers
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {/* Order placing modal */}
        {showOrderPlacing ? (
          <div className={styles.modalBackdrop} role="presentation">
            <div
              className={styles.modalCardSmall}
              role="dialog"
              aria-modal="true"
            >
              <div className={styles.modalDrag} />
              <p className={styles.orderTitle}>Placing Your Order</p>
              <p className={styles.modalSubtext}>
                Hang tight, we&apos;re confirming your order...
              </p>
              <div className={styles.placingLoader} aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
