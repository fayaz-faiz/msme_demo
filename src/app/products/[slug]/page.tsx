"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { postSearchById, searchStoreByItems } from "@/api";
import { AddToCartButton } from "@/features/cart/components/AddToCartButton";
import { useLocation } from "@/features/location/context/location-context";
import { ProductTypeBadge } from "@/features/product/components/ProductMeta";
import type { Product } from "@/features/product/domain/product";
import { formatCurrency } from "@/shared/lib/format-currency";
import { buildPriceDisplay } from "@/shared/lib/price-display";
import styles from "./page.module.css";

type ApiFoodType = {
  veg?: string | null;
  non_veg?: string | null;
};

type ApiProductItem = {
  _id?: string;
  item_id?: string;
  parent_item_id?: string;
  provider_id?: string;
  domain?: string;
  sub_category?: string;
  item_name?: string;
  item_short_desc?: string;
  item_long_desc?: string;
  item_symbol?: string;
  item_images?: string[];
  item_selling_price?: number;
  item_mrp_price?: number;
  item_discount_percentage?: number;
  item_available_count?: string | number;
  item_measure_value?: string | number;
  item_measure_quantity?: string;
  gender?: string;
  size_chart?: string;
  item_veg_or_nonveg?: ApiFoodType;
  customizable?: boolean;
  provider_name?: string;
  provider_location_street?: string;
  provider_location_city?: string;
  provider_location_area_code?: string;
  manufacturer_details?: {
    common_or_generic_name_of_commodity?: string;
  };
  item_timestamp?: string;
  item_returnable_status?: boolean;
  item_cancellable_status?: boolean;
  max_time_to_ship_minutes?: number;
  item_offers?: string[];
  brand?: string;
  cpu?: string;
  ram?: string | number;
  ram_unit?: string;
  colour?: string;
  colour_name?: string;
  size?: string | number;
  storage?: string | number;
  storage_unit?: string;
  storage_type?: string;
  os_type?: string;
  os_version?: string;
  screen_size?: string | number;
  height?: string | number;
  length?: string | number;
  weight?: string | number;
  breadth?: string | number;
};

type ProductDetailsApiResponse = {
  updated_results?: ApiProductItem;
  variant_result?: ApiProductItem[];
};

type ProductView = Product & {
  mrpPrice?: number;
  discountPercentage?: number;
};

type PostSearchByIdResponse = {
  data?: {
    status?: boolean;
    data?: ProductDetailsApiResponse;
  };
};

type SearchStoreItemsResponse = {
  data?: {
    status?: boolean;
    data?: {
      data?: ApiProductItem[];
    };
  };
};

const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80";

const toSlug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const normalizeCategoryValue = (value?: string | null) =>
  String(value || "")
    .trim()
    .toLowerCase();

const normalizeNameValue = (value?: string | null) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const toProduct = (item: ApiProductItem | null, slug: string, fallbackId: string): ProductView | null => {
  if (!item) {
    return null;
  }

  const id = item._id || item.item_id || fallbackId;
  const name = item.item_name || "Untitled item";
  const description = item.item_short_desc || item.item_long_desc || name;
  const isVeg = item.item_veg_or_nonveg?.veg === "yes";
  const isNonVeg = item.item_veg_or_nonveg?.non_veg === "yes";

  return {
    id,
    slug: `${toSlug(name)}-${toSlug(id).slice(0, 8)}`,
    shopSlug: slug,
    name,
    description,
    foodType: isVeg ? "veg" : isNonVeg ? "non-veg" : undefined,
    hasVariants: !!item.customizable,
    price: Number(item.item_selling_price || 0),
    mrpPrice: Number(item.item_mrp_price || 0) || undefined,
    discountPercentage: Number(item.item_discount_percentage || 0) || undefined,
    stock: Number(item.item_available_count || 0),
    image: item.item_images?.[0] || item.item_symbol || DEFAULT_IMAGE,
  };
};

const getItemId = (item: ApiProductItem | null | undefined) => String(item?._id || item?.item_id || "").trim();

const isRet14Product = (item: ApiProductItem | null, category: string) => {
  const value = normalizeCategoryValue(item?.domain || category);
  return (
    value === "ondc:ret14" ||
    value === "electronics" ||
    value.includes("ret14")
  );
};

const isRet12Product = (item: ApiProductItem | null, category: string) => {
  const value = normalizeCategoryValue(item?.domain || category);
  return value === "ondc:ret12" || value === "fashion" || value.includes("ret12");
};

const isRetailQuantityProduct = (item: ApiProductItem | null, category: string) => {
  const value = normalizeCategoryValue(item?.domain || category);
  const compactValue = value.replace(/[^a-z0-9]/g, "");

  return (
    value === "ondc:ret10" ||
    value === "ondc:ret16" ||
    value === "ondc:ret13" ||
    value === "grocery" ||
    value === "home & kitchen" ||
    value === "home and kitchen" ||
    value === "beauty and personal care" ||
    compactValue.includes("ret10") ||
    compactValue.includes("ret16") ||
    compactValue.includes("ret13") ||
    compactValue.includes("grocery") ||
    compactValue.includes("homekitchen") ||
    compactValue.includes("beauty and personal care")
  );
};

const getItemMeasureKey = (item: ApiProductItem) =>
  String(item.item_measure_value ?? "").trim();

const isMatchingItemName = (baseItem: ApiProductItem | null, candidate: ApiProductItem) => {
  const baseName = normalizeNameValue(baseItem?.item_name);
  const candidateName = normalizeNameValue(candidate.item_name);
  return Boolean(baseName && candidateName && baseName === candidateName);
};

const extractVariantItems = (
  data: ProductDetailsApiResponse,
  mode: "quantity" | "specs",
  baseItem?: ApiProductItem | null,
): ApiProductItem[] => {
  const seen = new Set<string>();
  return (Array.isArray(data.variant_result) ? data.variant_result : [])
    .filter((item) => {
      if (mode === "quantity" && !isMatchingItemName(baseItem || null, item)) {
        return false;
      }
      const itemId = mode === "quantity" ? getItemMeasureKey(item) : getItemId(item);
      if (!itemId || seen.has(itemId)) {
        return false;
      }
      seen.add(itemId);
      return true;
    });
};

const compactValue = (value: unknown, unit = "") => {
  const text = String(value ?? "").trim();
  const suffix = String(unit || "").trim();
  if (!text) return "";
  return suffix ? `${text} ${suffix}` : text;
};

const getSizeValue = (variant: ApiProductItem) => compactValue(variant.size);

const getVariantSpecs = (variant: ApiProductItem) =>
  [
    { label: "RAM", value: compactValue(variant.ram, variant.ram_unit) },
    { label: "Storage", value: compactValue(variant.storage, variant.storage_unit || variant.storage_type) },
    { label: "Color", value: variant.colour_name},
  ].filter((spec) => spec.value);

type FashionVariantGroup = {
  colorKey: string;
  colorLabel: string;
  colorValue?: string;
  variants: ApiProductItem[];
};

const getFashionColorKey = (variant: ApiProductItem) =>
  normalizeNameValue(variant.colour_name);

const getFashionColorLabel = (variant: ApiProductItem) =>
  String(variant.colour_name).trim();

const getFashionColorValue = (variant: ApiProductItem) => String(variant.colour || "").trim();

const buildFashionVariantGroups = (variants: ApiProductItem[]) => {
  const groups = new Map<string, FashionVariantGroup>();

  variants.forEach((variant) => {
    const colorKey = getFashionColorKey(variant);
    const colorLabel = getFashionColorLabel(variant);
    const colorValue = getFashionColorValue(variant) || undefined;
    const existing = groups.get(colorKey);

    if (!existing) {
      groups.set(colorKey, {
        colorKey,
        colorLabel,
        colorValue,
        variants: [variant],
      });
      return;
    }

    const currentSizeKey = normalizeNameValue(getSizeValue(variant).replace(/SIZE_/g, ''));
    const hasMatchingSize = existing.variants.some(
      (entry) => normalizeNameValue(getSizeValue(entry).replace(/SIZE_/g, '')) === currentSizeKey,
    );

    if (!hasMatchingSize) {
      existing.variants.push(variant);
    }
  });

  return Array.from(groups.values());
};

const hasRequiredVariantSpecs = (variant: ApiProductItem) =>
  Boolean(
    compactValue(variant.ram, variant.ram_unit) &&
    compactValue(variant.storage, variant.storage_unit || variant.storage_type) &&
    (variant.colour_name),
  );

const hasRequiredFashionSpecs = (variant: ApiProductItem) =>
  Boolean(getSizeValue(variant).replace(/SIZE_/g, '') && (variant.colour_name ));

export default function ProductDetailsPage() {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const { location } = useLocation();

  const slug = params?.slug || "";
  const id = searchParams.get("id") || "";
  const providerId = searchParams.get("providerId") || "";
  const providerLocationId = searchParams.get("providerLocationId") || "";
  const parentItemId = searchParams.get("parentItemId") || "";
  const category = searchParams.get("category") || "";
  const subCategoryName = searchParams.get("subCategoryName") || "";
  const shopName = searchParams.get("shopName") || slug.replace(/-/g, " ");
  const shopImage = searchParams.get("shopImage") || DEFAULT_IMAGE;
  const distance = searchParams.get("distance") || "-";
  const serviceable = searchParams.get("serviceable") === "true";

  const [loading, setLoading] = useState(true);
  const [loadingRelated, setLoadingRelated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<ApiProductItem | null>(null);
  const [relatedItems, setRelatedItems] = useState<ApiProductItem[]>([]);
  const [activeItemId, setActiveItemId] = useState(id);
  const [variantItems, setVariantItems] = useState<ApiProductItem[]>([]);
  const [quantityVariantItems, setQuantityVariantItems] = useState<ApiProductItem[]>([]);
  const [fashionVariantItems, setFashionVariantItems] = useState<ApiProductItem[]>([]);
  const [fashionOptionsOpen, setFashionOptionsOpen] = useState(false);
  const [sizeChartOpen, setSizeChartOpen] = useState(false);

  const lastFetchKeyRef = useRef("");

  const product = useMemo(() => toProduct(details, slug, activeItemId || id), [activeItemId, details, id, slug]);
  const productPriceDisplay = useMemo(
    () =>
      product
        ? buildPriceDisplay({
          sellingPrice: product.price,
          mrpPrice: product.mrpPrice,
          discountPercentage: product.discountPercentage,
        })
        : null,
    [product],
  );
  const isQuantityCategory = isRetailQuantityProduct(details, category);
  const isFashionCategory = isRet12Product(details, category);
  const variantMode = isQuantityCategory
    ? "quantity"
    : isFashionCategory
      ? "fashion"
      : isRet14Product(details, category)
        ? "specs"
        : "none";
  const visibleQuantityVariants = quantityVariantItems.length
    ? quantityVariantItems
    : variantItems;
  const visibleFashionVariants = fashionVariantItems.length
    ? fashionVariantItems
    : variantItems;
  const shouldUseFashionOptionsModal =
    variantMode === "fashion" && visibleFashionVariants.length > 1;
  const selectedFashionVariant =
    visibleFashionVariants.find((variant) => getItemId(variant) === activeItemId) ||
    visibleFashionVariants[0] ||
    null;
  const fashionVariantGroups = useMemo(
    () => buildFashionVariantGroups(visibleFashionVariants),
    [visibleFashionVariants],
  );
  const selectedFashionGroup = useMemo(() => {
    const selectedColorKey = selectedFashionVariant
      ? getFashionColorKey(selectedFashionVariant)
      : "";
    return (
      fashionVariantGroups.find((group) => group.colorKey === selectedColorKey) ||
      fashionVariantGroups[0] ||
      null
    );
  }, [fashionVariantGroups, selectedFashionVariant]);
  const resolvedSizeChartUrl = useMemo(() => {
    const activeFashionVariant =
      visibleFashionVariants.find((variant) => getItemId(variant) === activeItemId) ||
      visibleFashionVariants[0] ||
      details;

    return details?.size_chart || activeFashionVariant?.size_chart || "";
  }, [activeItemId, details, visibleFashionVariants]);
  const shouldShowVariants =
    variantMode !== "none" &&
    (variantMode === "quantity"
      ? visibleQuantityVariants.length > 1
      : variantMode === "fashion"
        ? visibleFashionVariants.length > 1
        : variantItems.length > 1);

  useEffect(() => {
    setActiveItemId(id);
    setVariantItems([]);
    setQuantityVariantItems([]);
    setFashionVariantItems([]);
    setFashionOptionsOpen(false);
    setSizeChartOpen(false);
    lastFetchKeyRef.current = "";
  }, [id]);

  useEffect(() => {
    if (!id || !providerId) {
      setLoading(false);
      setError("Missing product details context. Please open this screen from a store product card.");
      return;
    }

    const gpsLatitude = Number(location?.lat ?? 12.9716);
    const gpsLongitude = Number(location?.lng ?? 77.5946);
    const selectedItemId = activeItemId || id;
    const fetchKey = [selectedItemId, providerId, parentItemId, gpsLatitude, gpsLongitude].join("|");

    if (lastFetchKeyRef.current === fetchKey) {
      return;
    }
    lastFetchKeyRef.current = fetchKey;

    const fetchData = async () => {
      setLoading(true);
      setLoadingRelated(true);
      setError(null);
      try {
        const detailsPayload = {
          id: selectedItemId,
          parent_item_id: parentItemId,
          provider_id: providerId,
          gpsLongitude,
          gpsLatitude,
        };

        const detailsResponse = (await postSearchById(detailsPayload)) as PostSearchByIdResponse;
        const detailsData: ProductDetailsApiResponse = detailsResponse?.data?.data || {};
        const updated = detailsData?.updated_results || null;
        const isQuantityProduct = isRetailQuantityProduct(updated, category);
        const isFashionProduct = isRet12Product(updated, category);
        const isRet14 = isRet14Product(updated, category);
        const incomingVariants = extractVariantItems(
          detailsData,
          isQuantityProduct ? "quantity" : "specs",
          updated,
        );
        const normalizedVariants = isQuantityProduct
          ? incomingVariants.filter((item) => getItemMeasureKey(item))
          : isFashionProduct
            ? incomingVariants.filter(hasRequiredFashionSpecs)
            : isRet14
              ? incomingVariants.filter(hasRequiredVariantSpecs)
              : [];

        if (!detailsResponse?.data?.status || !updated) {
          setDetails(null);
          setError("Unable to load product details right now.");
          return;
        }

        setDetails(updated);
        setVariantItems((current) => {
          if (isQuantityProduct) {
            return normalizedVariants.length > 1 ? normalizedVariants : current;
          }

          return normalizedVariants.length ? normalizedVariants : [];
        });
        if (isQuantityProduct) {
          setQuantityVariantItems((current) =>
            normalizedVariants.length > 1 ? normalizedVariants : current,
          );
        } else if (isFashionProduct) {
          setFashionVariantItems((current) =>
            normalizedVariants.length > 1 ? normalizedVariants : current,
          );
        } else {
          setQuantityVariantItems([]);
          setFashionVariantItems([]);
        }

        if (providerLocationId && category) {
          const relatedPayload = {
            providerId,
            providerLocationId,
            searchText: "",
            subCategoryName: subCategoryName === "All Items" ? "" : subCategoryName,
            page: 1,
            pageSize: 10,
            category,
          };

          const relatedResponse = (await searchStoreByItems(relatedPayload)) as SearchStoreItemsResponse;
          if (relatedResponse?.data?.status) {
            const incoming = (relatedResponse?.data?.data?.data || []) as ApiProductItem[];
            setRelatedItems(incoming.filter((item) => getItemId(item) !== selectedItemId));
          } else {
            setRelatedItems([]);
          }
        } else {
          setRelatedItems([]);
        }
      } catch (fetchError) {
        console.error("Product details fetch error:", fetchError);
        setDetails(null);
        setRelatedItems([]);
        setError("Something went wrong while loading product details.");
      } finally {
        setLoading(false);
        setLoadingRelated(false);
      }
    };

    void fetchData();
  }, [activeItemId, category, id, location?.lat, location?.lng, parentItemId, providerId, providerLocationId, subCategoryName]);

  useEffect(() => {
    if (!fashionOptionsOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setFashionOptionsOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [fashionOptionsOpen]);

  useEffect(() => {
    if (!sizeChartOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSizeChartOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [sizeChartOpen]);

  return (
    <section className={`page ${styles.pageWrap}`}>
      <header className={styles.topBar}>
        <Link
          href={{
            pathname: "/store",
            query: {
              providerId,
              providerLocationId,
              category,
              shopName,
              shopImage,
              distance,
              serviceable: String(serviceable),
            },
          }}
          className={styles.backLink}
        >
          <span className={styles.backIcon} aria-hidden="true">
            ←
          </span>
          <span>Back to {shopName}</span>
        </Link>
      </header>

      {loading ? (
        <article className={styles.loaderCard}>
          <div className={styles.loader} />
          <p>Loading product details...</p>
        </article>
      ) : null}

      {!loading && error ? (
        <article className={styles.errorCard}>
          <h1>Unable to load product</h1>
          <p>{error}</p>
        </article>
      ) : null}

      {!loading && !error && product && details ? (
        <>
          <article className={styles.heroCard}>
            <div className={styles.imageCol}>
              <img
                src={product.image || DEFAULT_IMAGE}
                alt={product.name}
                className={styles.mainImage}
                onError={(event) => {
                  const img = event.currentTarget;
                  img.src = DEFAULT_IMAGE;
                }}
              />
            </div>
            <div className={styles.infoCol}>
              <p className={styles.kicker}>{shopName}</p>
              <h1 className={styles.title}>{product.name}</h1>
              <ProductTypeBadge foodType={product.foodType} />
              <p className={styles.shortDesc}>{details.item_short_desc || "No short description available."}</p>
              {productPriceDisplay ? (
                <div className={styles.priceStack}>
                  {productPriceDisplay.mrpPrice ? (
                    <span className={styles.mrpPrice}>
                      {formatCurrency(productPriceDisplay.mrpPrice)}
                    </span>
                  ) : null}
                  <p className={styles.price}>
                    {formatCurrency(productPriceDisplay.sellingPrice)}
                  </p>
                  {productPriceDisplay.discountLabel ? (
                    <span className={styles.discountNote}>
                      {productPriceDisplay.discountLabel}
                    </span>
                  ) : null}
                </div>
              ) : (
                <p className={styles.price}>{formatCurrency(product.price)}</p>
              )}

              <div className={styles.measureRow}>
                <span>
                  {variantMode === "quantity" ? "Net Quantity" : "Qty"}:{" "}
                  {details.item_measure_value || "-"} {details.item_measure_quantity || ""}
                </span>
                {typeof details.max_time_to_ship_minutes === "number" ? (
                  <span>Delivery in {details.max_time_to_ship_minutes} min</span>
                ) : null}
              </div>

              <div className={styles.statusRow}>
                <span className={`${styles.pill} ${styles.returnablePill}`}>{details.item_returnable_status ? "Returnable" : "Non-Returnable"}</span>
                <span className={`${styles.pill} ${styles.returnablePill}`}>{details.item_cancellable_status ? "Cancellable" : "Non-Cancellable"}</span>
                {product.hasVariants ? <span className={styles.pill}>Customizable</span> : null}
              </div>

              {shouldShowVariants ? (
                <section className={styles.variantPanel} aria-label="Available options">
                  <div className={styles.variantHeader}>
                    <div className={styles.variantHeadingGroup}>
                      <h2>
                        {variantMode === "quantity"
                          ? "Net Quantity"
                          : variantMode === "fashion"
                            ? "Available Options"
                            : "Available Options"}
                      </h2>
                      {/* <span>
                        {(variantMode === "quantity"
                          ? visibleQuantityVariants
                          : variantMode === "fashion"
                            ? visibleFashionVariants
                            : variantItems
                        ).length} options
                      </span> */}
                    </div>
                    {variantMode === "fashion" && resolvedSizeChartUrl ? (
                      <div className={styles.sizeChartCtaRow}>
                        <button
                          type="button"
                          className={styles.sizeChartButton}
                          onClick={() => setSizeChartOpen(true)}
                        >
                          View size chart
                        </button>
                      </div>
                    ) : null}
                  </div>


                  {variantMode === "quantity" ? (
                    <div className={styles.quantityPills}>
                      {visibleQuantityVariants.map((variant) => {
                        const variantId = getItemId(variant);
                        const selectedQuantity =
                          String(details.item_measure_value ?? "").trim() ===
                          String(variant.item_measure_value ?? "").trim();
                        const label = `${variant.item_measure_value || "-"} ${variant.item_measure_quantity || ""
                          }`.trim();

                        const pill = (
                          <span
                            className={`${styles.quantityPill} ${selectedQuantity ? styles.quantityPillSelected : ""
                              }`}
                          >
                            {label}
                          </span>
                        );

                        if (visibleQuantityVariants.length <= 1) {
                          return (
                            <div key={variantId || label} className={styles.quantityPillWrap}>
                              {pill}
                            </div>
                          );
                        }

                        return (
                          <button
                            key={variantId || label}
                            type="button"
                            className={styles.quantityPillButton}
                            onClick={() => {
                              if (!variantId || selectedQuantity) {
                                return;
                              }
                              setActiveItemId(variantId);
                            }}
                          >
                            {pill}
                          </button>
                        );
                      })}
                    </div>
                  ) : variantMode === "fashion" ? (
                    <div className={styles.fashionOptionsInline}>
                      {selectedFashionGroup ? (
                        <div className={styles.fashionOptionsRow}>
                          <button
                            type="button"
                            className={`${styles.variantCard} ${styles.variantCardSelected} ${styles.fashionDefaultCard}`}
                            onClick={() => {
                              const variantId = getItemId(selectedFashionVariant);
                              if (!variantId || variantId === getItemId(details)) {
                                return;
                              }
                              setActiveItemId(variantId);
                            }}
                          >
                            <div className={styles.fashionSelectedMeta}>
                              <span className={styles.variantTitle}>Selected option</span>
                              <span className={styles.fashionColorLabel}>
                                {shouldUseFashionOptionsModal ? (
                                  <button
                                    type="button"
                                    className={styles.fashionMoreLink}
                                    onClick={() => setFashionOptionsOpen(true)}
                                  >
                                    More options
                                  </button>
                                ) : null}
                              </span>
                            </div>
                            <div className={styles.fashionSelectedMeta}>
                              <span className={styles.fashionColorLabel}>
                                Color : {selectedFashionGroup.colorLabel}
                              </span>
                              <span className={styles.fashionSelectedSize}>
                                  Size: {getSizeValue(selectedFashionVariant || selectedFashionGroup.variants[0]).replace(/SIZE_/g, '')}
                              </span>
                            </div>
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className={styles.variantList}>
                      {variantItems.map((variant, index) => {
                        const variantId = getItemId(variant);
                        const selected = variantId === getItemId(details);
                        return (
                          <button
                            key={variantId}
                            type="button"
                            className={`${styles.variantCard} ${selected ? styles.variantCardSelected : ""
                              }`}
                            onClick={() => {
                              if (!variantId || selected) {
                                return;
                              }
                              setActiveItemId(variantId);
                            }}
                          >
                            <span className={styles.variantTitle}>Option {index + 1}</span>
                            <span className={styles.variantSpecs}>
                              {getVariantSpecs(variant).map((spec) => (
                                <span
                                  key={`${variantId}-${spec.label}`}
                                  className={styles.variantSpec}
                                >
                                  {spec.label}: {spec.value}
                                </span>
                              ))}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>
              ) : null}

              {fashionOptionsOpen && shouldUseFashionOptionsModal ? (
                <div
                  className={styles.sizeChartModalOverlay}
                  role="dialog"
                  aria-modal="true"
                  aria-label="Available fashion options"
                  onClick={() => setFashionOptionsOpen(false)}
                >
                  <div
                    className={styles.sizeChartModal}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className={styles.sizeChartModalHeader}>
                      <h3>Available Options</h3>
                      <button
                        type="button"
                        className={styles.sizeChartCloseButton}
                        onClick={() => setFashionOptionsOpen(false)}
                        aria-label="Close available options"
                      >
                        ×
                      </button>
                    </div>
                    <div className={styles.fashionOptionsModalList}>
                      {fashionVariantGroups.map((group) => {
                        const selectedGroupVariant =
                          group.variants.find((variant) => getItemId(variant) === activeItemId) ||
                          group.variants[0] ||
                          null;
                        const groupSelected = Boolean(
                          selectedGroupVariant && getItemId(selectedGroupVariant) === activeItemId,
                        );
                        return (
                          <section key={group.colorKey} className={styles.fashionColorGroup}>
                            <div className={styles.fashionColorHeader}>
                              <div className={styles.fashionColorSwatchRow}>
                                <span
                                  className={styles.fashionColorSwatch}
                                  style={{ backgroundColor: group.colorValue || "#d9d9d9" }}
                                  aria-hidden="true"
                                />
                                <div>
                                  <span className={styles.fashionColorLabel}>{group.colorLabel}</span>
                                  <p className={styles.fashionColorMeta}>
                                    {group.variants.length} size
                                    {group.variants.length === 1 ? "" : "s"}
                                  </p>
                                </div>
                              </div>
                              {groupSelected ? (
                                <span className={styles.fashionSelectedBadge}>Selected</span>
                              ) : null}
                            </div>
                            <div className={styles.fashionSizeChips}>
                              {group.variants.map((variant) => {
                                const variantId = getItemId(variant);
                                const selected = variantId === activeItemId;
                                const sizeLabel = getSizeValue(variant).replace(/SIZE_/g, '') || "One size";

                                return (
                                  <button
                                    key={variantId || sizeLabel}
                                    type="button"
                                    className={`${styles.fashionSizeChip} ${selected ? styles.fashionSizeChipSelected : ""
                                      }`}
                                    onClick={() => {
                                      if (!variantId || selected) {
                                        return;
                                      }
                                      setActiveItemId(variantId);
                                      setFashionOptionsOpen(false);
                                    }}
                                  >
                                    {sizeLabel}
                                  </button>
                                );
                              })}
                            </div>
                          </section>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : null}

              {sizeChartOpen && resolvedSizeChartUrl ? (
                <div
                  className={styles.sizeChartModalOverlay}
                  role="dialog"
                  aria-modal="true"
                  aria-label="Size chart"
                  onClick={() => setSizeChartOpen(false)}
                >
                  <div
                    className={styles.sizeChartModal}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className={styles.sizeChartModalHeader}>
                      <h3>Size Chart</h3>
                      <button
                        type="button"
                        className={styles.sizeChartCloseButton}
                        onClick={() => setSizeChartOpen(false)}
                        aria-label="Close size chart"
                      >
                        ×
                      </button>
                    </div>
                    <div className={styles.sizeChartImageWrap}>
                      <img
                        src={resolvedSizeChartUrl}
                        alt={`${product.name} size chart`}
                        className={styles.sizeChartImage}
                        onError={(event) => {
                          const img = event.currentTarget;
                          img.style.display = "none";
                        }}
                      />
                    </div>
                  </div>
                </div>
              ) : null}

              <div className={styles.addCta}>
                <AddToCartButton product={product} useServerCart />
              </div>

              <div className={styles.shopMeta}>
                <span>{distance}</span>
                <span className={serviceable ? styles.greenText : styles.redText}>
                  {serviceable ? "Deliverable" : "Not Deliverable"}
                </span>
              </div>
            </div>
          </article>

          <section className={styles.detailsGrid}>
            <details className={styles.accordionItem} open>
              <summary className={styles.accordionSummary}>
                <span>Product Details</span>
                <span className={styles.accordionIcon} aria-hidden="true">
                  ▾
                </span>
              </summary>
              <div className={styles.accordionBody}>
                <p>{details.item_long_desc || details.item_short_desc || "No description available."}</p>
                {details.item_offers?.length ? (
                  <div className={styles.block}>
                    <h3>Available Offers</h3>
                    <ul className={styles.list}>
                      {details.item_offers.map((offer, index) => (
                        <li key={`${offer}-${index}`}>{offer}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </details>

            <details className={styles.accordionItem}>
              <summary className={styles.accordionSummary}>
                <span>Vendor Details</span>
                <span className={styles.accordionIcon} aria-hidden="true">
                  ▾
                </span>
              </summary>
              <div className={styles.accordionBody}>
                <p>
                  <strong>Name:</strong> {details.provider_name || shopName}
                </p>
                <p>
                  <strong>Address:</strong>{" "}
                  {[details.provider_location_street, details.provider_location_city, details.provider_location_area_code]
                    .filter(Boolean)
                    .join(", ") || "Not available"}
                </p>
                {details.manufacturer_details?.common_or_generic_name_of_commodity ? (
                  <p>
                    <strong>Commodity:</strong> {details.manufacturer_details.common_or_generic_name_of_commodity}
                  </p>
                ) : null}
                {details.item_timestamp ? (
                  <p>
                    <strong>Packed/Imported:</strong> {new Date(details.item_timestamp).toLocaleString()}
                  </p>
                ) : null}
              </div>
            </details>
          </section>

          <section className={styles.relatedSection}>
            <div className={styles.sectionHeader}>
              <h2>Other products from this seller</h2>
              {loadingRelated ? <span>Loading...</span> : <span>{relatedItems.length} items</span>}
            </div>

            {relatedItems.length ? (
              <div className={styles.relatedGrid}>
                {relatedItems.map((item) => {
                  const relatedProduct = toProduct(item, slug, item._id || item.item_id || "");
                  if (!relatedProduct) {
                    return null;
                  }
                  const relatedPriceDisplay = buildPriceDisplay({
                    sellingPrice: relatedProduct.price,
                    mrpPrice: relatedProduct.mrpPrice,
                    discountPercentage: relatedProduct.discountPercentage,
                  });

                  return (
                    <article key={relatedProduct.id} className={styles.relatedCard}>
                      <Link
                        href={{
                          pathname: `/products/${relatedProduct.slug}`,
                          query: {
                            id: relatedProduct.id,
                            providerId,
                            providerLocationId,
                            parentItemId: item.parent_item_id || "",
                            category,
                            subCategoryName: item.sub_category || subCategoryName,
                            shopName,
                            shopImage,
                            distance,
                            serviceable: String(serviceable),
                          },
                        }}
                        className={styles.relatedImageWrap}
                      >
                        <img
                          src={relatedProduct.image || DEFAULT_IMAGE}
                          alt={relatedProduct.name}
                          className={styles.relatedImage}
                          onError={(event) => {
                            const img = event.currentTarget;
                            img.src = DEFAULT_IMAGE;
                          }}
                        />
                      </Link>
                      <div className={styles.relatedBody}>
                        <h3>{relatedProduct.name}</h3>
                        <p>{relatedProduct.description}</p>
                        <div className={styles.relatedBottom}>
                          <div className={styles.relatedPriceStack}>
                            {relatedPriceDisplay.mrpPrice ? (
                              <span className={styles.relatedMrpPrice}>
                                {formatCurrency(relatedPriceDisplay.mrpPrice)}
                              </span>
                            ) : null}
                            <span className={styles.relatedPrice}>
                              {formatCurrency(relatedPriceDisplay.sellingPrice)}
                            </span>
                            {relatedPriceDisplay.discountLabel ? (
                              <span className={styles.relatedDiscountNote}>
                                {relatedPriceDisplay.discountLabel}
                              </span>
                            ) : null}
                          </div>
                          <Link
                            href={{
                              pathname: `/products/${relatedProduct.slug}`,
                              query: {
                                id: relatedProduct.id,
                                providerId,
                                providerLocationId,
                                parentItemId: item.parent_item_id || "",
                                category,
                                subCategoryName: item.sub_category || subCategoryName,
                                shopName,
                                shopImage,
                                distance,
                                serviceable: String(serviceable),
                              },
                            }}
                          >
                            Details
                          </Link>
                        </div>
                        <AddToCartButton product={relatedProduct} useServerCart />
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <article className={styles.emptyCard}>
                <p>No related products available for this seller.</p>
              </article>
            )}
          </section>
        </>
      ) : null}
    </section>
  );
}
