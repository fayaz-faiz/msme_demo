"use client";

/* eslint-disable @next/next/no-img-element */

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getCartLengthWeb, postAddUpdateCart, postCartByIdWeb, postSearchByIdWeb } from "@/api";
import { Product } from "@/features/product/domain/product";
import { addItem, decreaseQuantity, increaseQuantity, removeItem, setItemQuantity } from "@/features/cart/store/cartSlice";
import { useAppDispatch, useAppSelector } from "@/features/cart/store/hooks";
import { useLocation } from "@/features/location/context/location-context";
import { setCartLength, setCartSummary } from "@/redux/slices";
import { notifyOrAlert } from "@/shared/lib/notify";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./AddToCartButton.module.css";

type AddToCartButtonProps = {
  product: Product;
  useServerCart?: boolean;
  storeDisabled?: boolean;
  onCartUpdated?: () => void | Promise<void>;
};

type CustomizationOption = {
  id: string;
  name: string;
  price?: number;
  isDefault?: boolean;
};

type CustomizationGroup = {
  groupId: string;
  groupName: string;
  type?: "SINGLE" | "MULTIPLE";
  min?: number;
  max?: number;
  options?: CustomizationOption[];
};

type SearchByIdResponse = {
  data?: {
    status?: boolean;
    data?: {
      customizationItems?: CustomizationGroup[];
    };
  };
};

type CartLengthResponse = {
  data?: {
    data?: number | string;
  };
};

type AddUpdateCartResponse = {
  data?: {
    status?: boolean;
    statusCode?: number;
    message?: string;
    data?: {
      cart_id?: string;
      item_count?: number | string;
      total_amount?: number;
      grand_total?: number;
      message?: string;
    };
  };
};

type CartByIdResponse = {
  data?: {
    data?: {
      total_amount?: number;
      item_count?: number;
    };
  };
};

export function AddToCartButton({ product, useServerCart = false, storeDisabled = false, onCartUpdated }: AddToCartButtonProps) {
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
  const [showCustomizationModal, setShowCustomizationModal] = useState(false);
  const [isLoadingCustomizations, setIsLoadingCustomizations] = useState(false);
  const [customizationGroups, setCustomizationGroups] = useState<CustomizationGroup[]>([]);
  const [selectedCustomizations, setSelectedCustomizations] = useState<Record<string, string[]>>({});
  const [lastCustomizationPayload, setLastCustomizationPayload] = useState<Record<string, string | string[]>>({});
  const [isClient, setIsClient] = useState(false);
  const currentQuery = searchParams?.toString();
  const nextPath = currentQuery ? `${pathname}?${currentQuery}` : pathname;
  const getApiErrorMessage = (error: unknown, fallback: string) => {
    if (typeof error === "object" && error !== null) {
      const maybeError = error as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      return maybeError.response?.data?.message || maybeError.message || fallback;
    }
    return fallback;
  };

  const syncCartLength = async () => {
    try {
      const result = (await getCartLengthWeb()) as CartLengthResponse;
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

  const updateServerCart = async (
    nextCount: number,
    customizationPayload: Record<string, string | string[]> = lastCustomizationPayload,
  ): Promise<{ ok: boolean; itemCount: number }> => {
    try {
      const payload = {
        ce_item_id: product.id,
        count: nextCount,
        paymentType: "ON-ORDER",
        gps: `${location?.lat ?? ""},${location?.lng ?? ""}`,
        area_code: location?.pincode ?? "",
        dest_location: "SEARCH",
        customization: customizationPayload,
      };

      const result = (await postAddUpdateCart(payload)) as AddUpdateCartResponse;
      const ok = !!result?.data?.status;
      const itemCount = Number(result?.data?.data?.item_count ?? nextCount);
      const statusCode = Number(result?.data?.statusCode ?? 0);
      const message = String(result?.data?.data?.message || result?.data?.message || "Unable to update cart.");
      const isCartEmptyResponse = statusCode === 406 || /cart\s*is\s*empty/i.test(message);

      if (ok) {
        const cartId = String(result?.data?.data?.cart_id || "");
        if (cartId) {
          try {
            const cartResp = (await postCartByIdWeb({ cart_id: cartId })) as CartByIdResponse;
            const totalAmount = Number(cartResp?.data?.data?.total_amount ?? 0);
            const cartItemCount = Number(cartResp?.data?.data?.item_count ?? itemCount);
            dispatch(setCartSummary({ cartId, totalAmount, itemCount: cartItemCount }));
          } catch {
            // non-critical — cart summary update fails silently
          }
        } else {
          await syncCartLength();
        }
        return { ok: true, itemCount };
      }

      if (isCartEmptyResponse) {
        dispatch(setCartSummary({ cartId: "", totalAmount: 0, itemCount: 0 }));
        dispatch(setCartLength(0));
        return { ok: false, itemCount: 0 };
      }

      notifyOrAlert(message, "warning");
      return { ok: false, itemCount: Number.isFinite(itemCount) ? itemCount : 0 };
    } catch (error) {
      const typed = error as { response?: { status?: number; data?: { message?: string } } };
      const statusCode = Number(typed?.response?.status ?? 0);
      const message = String(getApiErrorMessage(error, "Unable to update cart."));
      const isCartEmptyResponse = statusCode === 406 || /cart\s*is\s*empty/i.test(message);

      if (isCartEmptyResponse) {
        dispatch(setCartSummary({ cartId: "", totalAmount: 0, itemCount: 0 }));
        dispatch(setCartLength(0));
        return { ok: false, itemCount: 0 };
      }

      notifyOrAlert(message, "error");
      return { ok: false, itemCount: 0 };
    }
  };

  const buildInitialSelections = (groups: CustomizationGroup[]) => {
    const nextSelections: Record<string, string[]> = {};
    groups.forEach((group) => {
      const options = group.options || [];
      const defaults = options.filter((option) => option.isDefault).map((option) => option.id);
      const fallbackDefault = defaults.length > 0 ? defaults : group.type === "SINGLE" && group.min ? [options[0]?.id].filter(Boolean) as string[] : [];
      nextSelections[group.groupId] = fallbackDefault;
    });
    return nextSelections;
  };

  const fetchCustomizations = async () => {
    const providerFromQuery = searchParams?.get("providerId") || "";
    const parentFromQuery = searchParams?.get("parentItemId") || "";
    const payload = {
      id: product.id,
      parent_item_id: parentFromQuery,
      provider_id: providerFromQuery,
      gpsLongitude: Number(location?.lng ?? 77.5946),
      gpsLatitude: Number(location?.lat ?? 12.9716),
    };

    const result = (await postSearchByIdWeb(payload)) as SearchByIdResponse;
    if (!result?.data?.status) {
      return [];
    }

    return (result?.data?.data?.customizationItems || []).filter((group) => group?.groupId);
  };

  const updateSelection = (group: CustomizationGroup, optionId: string) => {
    setSelectedCustomizations((prev) => {
      const existing = prev[group.groupId] || [];
      if (group.type === "SINGLE") {
        return { ...prev, [group.groupId]: [optionId] };
      }

      if (existing.includes(optionId)) {
        return { ...prev, [group.groupId]: existing.filter((id) => id !== optionId) };
      }
      const max = Number(group.max || 0);
      if (max > 0 && existing.length >= max) {
        return prev;
      }
      return { ...prev, [group.groupId]: [...existing, optionId] };
    });
  };

  const validateSelections = () => {
    for (const group of customizationGroups) {
      const selectedCount = (selectedCustomizations[group.groupId] || []).length;
      const min = Number(group.min || 0);
      const max = Number(group.max || 0);
      if (min > 0 && selectedCount < min) {
        notifyOrAlert(`Please select at least ${min} option(s) in ${group.groupName}.`, "warning");
        return false;
      }
      if (max > 0 && selectedCount > max) {
        notifyOrAlert(`Please select maximum ${max} option(s) in ${group.groupName}.`, "warning");
        return false;
      }
    }
    return true;
  };

  const mapCustomizationPayload = () => {
    const payload: Record<string, string | string[]> = {};
    customizationGroups.forEach((group) => {
      const selected = selectedCustomizations[group.groupId] || [];
      if (!selected.length) {
        return;
      }
      payload[group.groupId] = group.type === "SINGLE" ? selected[0] : selected;
    });
    return payload;
  };

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!showCustomizationModal || !isClient) {
      return;
    }
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [showCustomizationModal, isClient]);

  const customizationModal =
    showCustomizationModal && isClient
      ? createPortal(
      <div className={styles.modalBackdrop} role="presentation">
        <div className={styles.modalCard} role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
          <h3 className={styles.modalTitle}>Customize {product.name}</h3>
          <div className={styles.modalContent}>
            {customizationGroups.map((group) => {
              const selected = selectedCustomizations[group.groupId] || [];
              const inputType = group.type === "SINGLE" ? "radio" : "checkbox";
              return (
                <div key={group.groupId} className={styles.groupBlock}>
                  <p className={styles.groupTitle}>
                    {group.groupName}
                    <span className={styles.groupHint}> (min {group.min || 0}, max {group.max || group.options?.length || 0})</span>
                  </p>
                  <div className={styles.optionList}>
                    {(group.options || []).map((option) => {
                      const checked = selected.includes(option.id);
                      return (
                        <label key={option.id} className={styles.optionRow}>
                          <input
                            type={inputType}
                            name={group.groupId}
                            checked={checked}
                            onChange={() => updateSelection(group, option.id)}
                          />
                          <span>{option.name}</span>
                          <strong>+{option.price || 0}</strong>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <div className={styles.modalActions}>
            <button type="button" className={styles.secondaryButton} onClick={() => setShowCustomizationModal(false)}>
              Cancel
            </button>
            <button
              type="button"
              className={styles.primaryButton}
              disabled={isUpdating}
              onClick={async () => {
                if (!validateSelections()) {
                  return;
                }
                const mappedPayload = mapCustomizationPayload();
                setLastCustomizationPayload(mappedPayload);
                setIsUpdating(true);
                const response = await updateServerCart(1, mappedPayload);
                setIsUpdating(false);
                if (!response.ok) {
                  return;
                }
                setShowCustomizationModal(false);
                dispatch(setItemQuantity({ product, quantity: response.itemCount }));
                await onCartUpdated?.();
              }}
            >
              {isUpdating ? "Adding..." : "Add"}
            </button>
          </div>
        </div>
      </div>,
      document.body,
    )
      : null;

  if (storeDisabled) {
    return (
      <button type="button" className={styles.closedButton} disabled>
        Unavailable
      </button>
    );
  }

  if (!quantity) {
    return (
      <>
        <button
          type="button"
          className={styles.addButton}
          disabled={isUpdating || isLoadingCustomizations}
          onClick={async () => {
            if (!ensureLoggedIn()) {
              return;
            }

            if (useServerCart) {
              if (product.hasVariants) {
                setIsLoadingCustomizations(true);
                try {
                  const groups = await fetchCustomizations();
                  if (groups.length > 0) {
                    setCustomizationGroups(groups);
                    setSelectedCustomizations(buildInitialSelections(groups));
                    setShowCustomizationModal(true);
                  } else {
                    setIsUpdating(true);
                    const response = await updateServerCart(1);
                    setIsUpdating(false);
                    if (response.ok) {
                      dispatch(setItemQuantity({ product, quantity: response.itemCount }));
                      await onCartUpdated?.();
                    }
                  }
                } catch (error) {
                  notifyOrAlert(getApiErrorMessage(error, "Unable to load customizations."), "error");
                } finally {
                  setIsLoadingCustomizations(false);
                }
                return;
              }

              setIsUpdating(true);
              const response = await updateServerCart(1);
              setIsUpdating(false);
              if (!response.ok) {
                return;
              }
              dispatch(setItemQuantity({ product, quantity: response.itemCount }));
              await onCartUpdated?.();
              return;
            }

            dispatch(addItem(product));
          }}
        >
          {isLoadingCustomizations ? "Loading..." : isUpdating ? "Adding..." : "Add"}
        </button>
        {customizationModal}
      </>
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
              void updateServerCart(0).then(() => onCartUpdated?.());
              return;
            }

            setIsUpdating(true);
            const response = await updateServerCart(nextCount);
            setIsUpdating(false);
            if (!response.ok) {
              return;
            }
            dispatch(setItemQuantity({ product, quantity: response.itemCount }));
            await onCartUpdated?.();
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
            await onCartUpdated?.();
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
