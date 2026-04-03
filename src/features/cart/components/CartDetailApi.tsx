"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getAddressWeb, getCartLengthWeb, initializeCartWeb, payemntGw, postAddUpdateCart, postCartByIdWeb, verifyCartWeb } from "@/api";
import { useLocation } from "@/features/location/context/location-context";
import { useAppDispatch, useAppSelector } from "@/features/cart/store/hooks";
import { LocationPickerModal } from "@/features/location/components/LocationPickerModal";
import { setCartLength } from "@/redux/slices";
import { formatCurrency } from "@/shared/lib/format-currency";
import { notifyOrAlert } from "@/shared/lib/notify";
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
  other_charges?: Array<{ title?: string; amount?: number; price?: { value?: string | number } }>;
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

export function CartDetailApi({ cartId }: CartDetailApiProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { location } = useLocation();
  const selectedAddressFromRedux = useAppSelector((state) => state.location.selectAddress as AddressItem | null);
  const [loading, setLoading] = useState(false);
  const [storeData, setStoreData] = useState<StoreData | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [error, setError] = useState("");
  const [activeItemId, setActiveItemId] = useState("");
  const [isInitializing, setIsInitializing] = useState(false);
  const [allAddress, setAllAddress] = useState<AddressItem[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showDeliveryOptions, setShowDeliveryOptions] = useState(false);
  const [showOrderPlacing, setShowOrderPlacing] = useState(false);
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);

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

    const existingScript = document.querySelector<HTMLScriptElement>('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existingScript) {
      if ((window as Window & { Razorpay?: unknown }).Razorpay) {
        return true;
      }
      await new Promise<void>((resolve, reject) => {
        const onLoad = () => resolve();
        const onError = () => reject(new Error("Unable to load payment script."));
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
      script.onerror = () => reject(new Error("Unable to load payment script."));
      document.body.appendChild(script);
    });

    return !!(window as Window & { Razorpay?: unknown }).Razorpay;
  };

  const initiatePayment = async (amount: number | string, uniqueId?: string, orderId?: string) => {
    const loaded = await loadRazorpayScript();
    if (!loaded) {
      throw new Error("Payment gateway could not be initialized. Please try again.");
    }

    const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_API_KEY || process.env.REACT_APP_RAZORPAY_API_KEY;
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

    const RazorpayConstructor = (window as Window & { Razorpay?: new (opts: any) => { open: () => void } }).Razorpay;
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
        await initiatePayment(responseData?.amount_due, responseData?.notes?.uniqueId, responseData?.id);
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
      const fromList = allAddress.find((entry) => entry._id === selectedAddressId);
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
      const message = err?.response?.data?.message || "Unable to load cart details.";
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
      const incoming = (Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(response?.data?.message)
            ? response.data.message
            : []) as AddressItem[];
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
    setError("");
    try {
      const activeAddress = getActiveAddress();
      const gps = activeAddress?.gps || `${location?.lat ?? ""},${location?.lng ?? ""}`;
      const payload = {
        cart_id: cartId,
        gps,
        area_code: activeAddress?.area_code || location?.pincode || "",
        paymentType: "ON-ORDER",
      };
      const response: any = await verifyCartWeb(payload);
      if (response?.data?.status) {
        await fetchCartDetails();
        return true;
      } else {
        const message = response?.data?.data?.message || response?.data?.message || "Cart verification failed.";
        setError(message);
        notifyOrAlert(message, "warning");
        return false;
      }
    } catch (err: any) {
      console.error(err);
      const message = err?.response?.data?.message || "Cart verification failed.";
      setError(message);
      notifyOrAlert(message, "error");
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
      const verified = await verifyCart();
      if (!verified) {
        return;
      }

      const payload = {
        cart_id: cartId,
        billing_address_id: activeAddress._id,
        shipping_address_id: activeAddress._id,
      };

      const initResponse: any = await initializeCartWeb(payload);
      if (!initResponse?.data?.status) {
        notifyOrAlert(initResponse?.data?.data?.message || initResponse?.data?.message || "Unable to initialize cart.", "warning");
        return;
      }
      setShowDeliveryOptions(true);
    } catch (err: any) {
      console.error(err);
      notifyOrAlert(err?.response?.data?.message || "Unable to initialize cart.", "error");
    } finally {
      setIsInitializing(false);
    }
  };

  const updateItemCount = async (item: CartItem, nextCount: number) => {
    setActiveItemId(item.ce_item_id);
    try {
      const payload = {
        ce_item_id: item.ce_item_id,
        count: Math.max(0, nextCount),
        paymentType: "ON-ORDER",
        gps: getActiveAddress()?.gps || `${location?.lat ?? ""},${location?.lng ?? ""}`,
        area_code: storeData?.provider_address?.area_code || getActiveAddress()?.area_code || location?.pincode || "",
        dest_location: "SEARCH",
        customization: {},
      };
      const result: any = await postAddUpdateCart(payload);
      const ok = !!result?.data?.status;
      if (!ok) {
        notifyOrAlert(result?.data?.data?.message || "Unable to update cart item.", "warning");
      }
      await verifyCart();
      await syncCartLength();
    } catch (err: any) {
      console.error(err);
      notifyOrAlert(err?.response?.data?.message || "Unable to update cart item.", "error");
    } finally {
      setActiveItemId("");
    }
  };

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

  const baseTotal = Number(storeData?.total_amount || 0);
  const extraCharges = (storeData?.other_charges || []).reduce((sum, charge) => {
    const amount = Number(charge?.amount ?? charge?.price?.value ?? 0);
    return sum + (Number.isFinite(amount) ? amount : 0);
  }, 0);
  const payTotal = baseTotal + extraCharges;

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
        <div className={styles.deliveryAddress}>
          <div className={styles.deliveryHead}>
            <span>Delivery address</span>
            <button type="button" className={styles.changeAddressButton} onClick={() => setShowLocationPicker(true)}>
              Change
            </button>
          </div>
          {getActiveAddress()?._id ? (
            <p>
              {`${getActiveAddress()?.building || ""}, ${getActiveAddress()?.locality || ""}, ${getActiveAddress()?.city || ""}, ${getActiveAddress()?.state || ""} - ${getActiveAddress()?.area_code || ""}`}
            </p>
          ) : (
            <p>No delivery address selected.</p>
          )}
        </div>
        <div className={styles.summaryRow}>
          <span>Items</span>
          <span>{cartItems.length}</span>
        </div>
        <div className={styles.summaryRow}>
          <span>Total</span>
          <strong>{formatCurrency(total)}</strong>
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.checkoutButton}
            onClick={handleViewDeliveryOptions}
            disabled={isInitializing || loading || cartItems.length === 0}
          >
            {isInitializing ? "Loading delivery options..." : "View delivery options"}
          </button>
          <Link href="/cart" className={styles.backButton}>
            Back to carts
          </Link>
        </div>
      </aside>

      <LocationPickerModal
        open={showLocationPicker}
        onClose={() => setShowLocationPicker(false)}
        onAddressSelected={(addressId) => setSelectedAddressId(addressId)}
      />

      {showDeliveryOptions ? (
        <div className={styles.modalBackdrop} role="presentation" onClick={() => setShowDeliveryOptions(false)}>
          <div className={styles.modalCard} role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <h3>Delivery options</h3>
            <p className={styles.modalSubtext}>
              Cart initialized successfully. Delivery is managed by the store.
            </p>
            <div className={styles.priceRows}>
              <div className={styles.summaryRow}>
                <span>Item total</span>
                <strong>{formatCurrency(baseTotal)}</strong>
              </div>
              {(storeData?.other_charges || []).map((charge) => (
                <div key={`${charge.title}-${charge.amount}-${charge?.price?.value}`} className={styles.summaryRow}>
                  <span>{charge.title || "Charge"}</span>
                  <strong>{formatCurrency(Number(charge.amount ?? charge?.price?.value ?? 0))}</strong>
                </div>
              ))}
              <div className={styles.summaryRow}>
                <span>Total to pay</span>
                <strong>{formatCurrency(payTotal)}</strong>
              </div>
            </div>
            <div className={styles.modalActions}>
              <button type="button" className={styles.backButton} onClick={() => setShowDeliveryOptions(false)}>
                Close
              </button>
              <button
                type="button"
                className={styles.checkoutButton}
                onClick={paymentGwApi}
                disabled={isPaymentProcessing}
              >
                {isPaymentProcessing ? "Processing..." : "Proceed"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showOrderPlacing ? (
        <div className={styles.modalBackdrop} role="presentation" onClick={() => setShowOrderPlacing(false)}>
          <div className={styles.modalCardSmall} role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <h3 className={styles.orderTitle}>Placing Your Order</h3>
            <p className={styles.modalSubtext}>Placing your order, please wait!!</p>
            <div className={styles.placingLoader} aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
