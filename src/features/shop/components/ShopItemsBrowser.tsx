"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { searchStoreByItems, postStoreSubcatApi } from "@/api";
import { useDebounce } from "@/shared/lib/use-debounce";
import { AddToCartButton } from "@/features/cart/components/AddToCartButton";
import { useAppSelector } from "@/features/cart/store/hooks";
import { useLocation } from "@/features/location/context/location-context";
import { ProductTypeBadge } from "@/features/product/components/ProductMeta";
import { Product } from "@/features/product/domain/product";
import { formatCurrency } from "@/shared/lib/format-currency";
import { toOndcCategory } from "@/features/shop/domain/ondc-category";
import styles from "./ShopItemsBrowser.module.css";
import { BackButton } from "@/shared/ui/BackButton";

type ShopItemsBrowserProps = {
  slug: string;
  providerId: string;
  providerLocationId: string;
  category: string;
  shopName: string;
  shopImage: string;
  distance: string;
  serviceable: boolean;
  storeLat?: string;
  storeLong?: string;
  storeLng?: string;
};

type SubCategory = {
  subCategoryName: string;
  code?: string;
};

type ProviderOffer = {
  id?: string;
  descriptor?: { code?: string };
  item_ids?: string[];
};

type StoreInfo = {
  provider_name?: string;
  bpp_provider_symbol?: string;
  provider_street?: string;
  provider_city?: string;
  distance?: string;
  verified?: boolean;
  category?: string;
  provider_id?: string;
  provider_location_id?: string;
  provider_contact_no?: string;
  provider_subcategories?: string[];
  provider_offers?: ProviderOffer[];
  provider_status?: string;
};

type ApiItem = {
  _id?: string;
  item_id?: string;
  parent_item_id?: string;
  sub_category?: string;
  item_name?: string;
  item_short_desc?: string;
  item_symbol?: string;
  item_selling_price?: number;
  item_available_count?: string;
  item_veg_or_nonveg?: {
    veg?: string | null;
    non_veg?: string | null;
  };
  customizable?: boolean;
};

type ShopProduct = Product & {
  parentItemId?: string;
  subCategoryName?: string;
};

type StoreSubCategoryApiResponse = {
  data?: {
    status?: boolean;
    data?: {
      result?: StoreInfo | null;
      availableSubCategories?: SubCategory[];
    };
  };
};

type SearchStoreItemsApiResponse = {
  data?: {
    status?: boolean;
    data?: {
      totalItems?: number;
      providerStatus?: boolean;
      maxTimeToShip?: string;
      data?: ApiItem[];
    };
  };
};

const PAGE_SIZE = 10;
const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80";
const DEFAULT_LATITUDE = 12.9716;
const DEFAULT_LONGITUDE = 77.5946;

const toSlug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const parseCoordinate = (value?: string | number | null) => {
  if (value === null || value === undefined) {
    return null;
  }
  const raw = String(value).trim();
  if (!raw) {
    return null;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
};

const mapApiItemToProduct = (item: ApiItem, shopSlug: string): ShopProduct => {
  const id =
    item._id ||
    item.item_id ||
    `${shopSlug}-${Math.random().toString(36).slice(2)}`;
  const name = item.item_name || "Untitled item";
  const description = item.item_short_desc || name;
  const isVeg = item.item_veg_or_nonveg?.veg === "yes";
  const isNonVeg = item.item_veg_or_nonveg?.non_veg === "yes";

  return {
    id,
    slug: `${toSlug(name)}-${toSlug(id).slice(0, 8)}`,
    shopSlug,
    name,
    description,
    foodType: isVeg ? "veg" : isNonVeg ? "non-veg" : undefined,
    hasVariants: !!item.customizable,
    price: Number(item.item_selling_price || 0),
    stock: Number(item.item_available_count || 0),
    image: item.item_symbol || DEFAULT_IMAGE,
    parentItemId: item.parent_item_id || "",
    subCategoryName: item.sub_category || "",
  };
};

const sortProducts = (products: Product[], sortBy: string) => {
  if (sortBy === "PRICE_LOW_TO_HIGH") {
    return [...products].sort((a, b) => a.price - b.price);
  }
  if (sortBy === "PRICE_HIGH_TO_LOW") {
    return [...products].sort((a, b) => b.price - a.price);
  }
  return products;
};

export function ShopItemsBrowser({
  slug,
  providerId,
  providerLocationId,
  category,
  shopName,
  shopImage,
  distance,
  serviceable,
  storeLat,
  storeLong,
  storeLng,
}: ShopItemsBrowserProps) {
  const router = useRouter();
  const { location } = useLocation();
  const accessToken = useAppSelector((state) => state.apiResponse.accessToken);
  const cartLength = useAppSelector((state) => state.apiResponse.cartLength);
  const cartTotalAmount = useAppSelector(
    (state) => state.apiResponse.cartTotalAmount,
  );
  const cartId = useAppSelector((state) => state.apiResponse.cartId);

  const mountCartTotalRef = useRef(cartTotalAmount);
  const [addedToCartHere, setAddedToCartHere] = useState(false);

  const [query, setQuery] = useState("");
  const searchText = useDebounce(query);
  const [loading, setLoading] = useState(false);
  const [productLoading, setProductLoading] = useState(false);
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [subCategoryData, setSubCategoryData] = useState<SubCategory[]>([]);
  const [selectedSubCategory, setSelectedSubCategory] = useState("All Items");
  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null);
  const [vegFilter, setVegFilter] = useState(false);
  const [nonVegFilter, setNonVegFilter] = useState(false);
  const [sortBy, setSortBy] = useState<
    "RELEVANCE" | "PRICE_LOW_TO_HIGH" | "PRICE_HIGH_TO_LOW"
  >("RELEVANCE");
  const [page, setPage] = useState(1);
  const [noProducts, setNoProducts] = useState(false);
  const [noData, setNoData] = useState(false);
  const [totalItems, setTotalItems] = useState(0);
  const [providerStatus, setProviderStatus] = useState(true);
  const [maxTimeToShip, setMaxTimeToShip] = useState("");
  const [storeInfoLoaded, setStoreInfoLoaded] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const observerRef = useRef<HTMLDivElement | null>(null);

  const mappedCategory = toOndcCategory(category);

  const finalProviderId = storeInfo?.provider_id || providerId;
  const finalProviderLocationId =
    storeInfo?.provider_location_id || providerLocationId;
  const finalCategory = storeInfo?.category || mappedCategory;
  const resolvedGpsLatitude = useMemo(() => {
    const fromQuery = parseCoordinate(storeLat);
    if (fromQuery !== null) {
      return fromQuery;
    }
    const fromLocation = parseCoordinate(location?.lat);
    if (fromLocation !== null) {
      return fromLocation;
    }
    return DEFAULT_LATITUDE;
  }, [storeLat, location?.lat]);
  const resolvedGpsLongitude = useMemo(() => {
    const fromQuery = parseCoordinate(storeLong ?? storeLng);
    if (fromQuery !== null) {
      return fromQuery;
    }
    const fromLocation = parseCoordinate(location?.lng);
    if (fromLocation !== null) {
      return fromLocation;
    }
    return DEFAULT_LONGITUDE;
  }, [storeLong, storeLng, location?.lng]);

  const resolvedShopName = storeInfo?.provider_name || shopName;
  const resolvedShopImage =
    storeInfo?.bpp_provider_symbol || shopImage || DEFAULT_IMAGE;
  const resolvedDistance = storeInfo?.distance || distance || "-";
  const isStoreOpen = storeInfo?.provider_status !== "disable";
  const resolvedDescription =
    [storeInfo?.provider_street, storeInfo?.provider_city]
      .filter(Boolean)
      .join(", ") || "";
  const showFoodTypeFilter = useMemo(() => {
    const value = String(finalCategory || mappedCategory || "")
      .toLowerCase()
      .trim();
    if (!value) {
      return false;
    }
    return (
      value === "grocery" ||
      value.includes("ret10") ||
      value.includes("ret11") ||
      value.includes("f&b") ||
      value.includes("fnb") ||
      value.includes("food & beverage")
    );
  }, [finalCategory, mappedCategory]);
  const isFoodAndBeverageCategory = useMemo(() => {
    const rawValue = String(finalCategory || mappedCategory || "")
      .toLowerCase()
      .trim();
    if (!rawValue) {
      return false;
    }

    const normalizedValue = rawValue.replace(/[^a-z0-9]/g, "");
    return (
      rawValue.includes("f&b") ||
      rawValue.includes("food & beverage") ||
      rawValue.includes("food and beverage") ||
      normalizedValue.includes("fnb") ||
      normalizedValue.includes("foodbeverage") ||
      normalizedValue.includes("foodbeverages") ||
      normalizedValue.includes("foodandbeverage") ||
      normalizedValue.includes("foodandbeverages") ||
      normalizedValue.includes("ret11")
    );
  }, [finalCategory, mappedCategory]);

  const fetchStoreSubCategories = async (
    providerIdParam: string,
    providerLocationIdParam: string,
  ) => {
    const data = {
      gpsLatitude: resolvedGpsLatitude,
      gpsLongitude: resolvedGpsLongitude,
      provider_id: providerIdParam,
      location_id: providerLocationIdParam,
    };

    setLoading(true);
    try {
      const resp = (await postStoreSubcatApi(
        data,
      )) as StoreSubCategoryApiResponse;
      if (resp?.data?.status) {
        const info = resp?.data?.data?.result || null;
        const subCats = (resp?.data?.data?.availableSubCategories ||
          []) as SubCategory[];

        setStoreInfo(info);
        setSubCategoryData(subCats);
        setSelectedSubCategory(subCats?.[0]?.subCategoryName || "All Items");
      }
    } catch (err) {
      console.error("getStoreSubCatList error:", err);
    } finally {
      setLoading(false);
      setStoreInfoLoaded(true);
    }
  };

  const fetchItems = async (pageNo: number, replace: boolean) => {
    if (!finalProviderId || !finalProviderLocationId || !finalCategory) {
      return;
    }

    setLoading(true);
    setProductLoading(true);

    const data = {
      providerId: finalProviderId,
      providerLocationId: finalProviderLocationId,
      searchText,
      subCategoryName:
        selectedSubCategory === "All Items" ? "" : selectedSubCategory,
      page: pageNo,
      pageSize: PAGE_SIZE,
      category: finalCategory,
      veg: showFoodTypeFilter && vegFilter ? "yes" : "",
      nonVeg: showFoodTypeFilter && nonVegFilter ? "yes" : "",
    };

    try {
      const response = (await searchStoreByItems(
        data,
      )) as SearchStoreItemsApiResponse;
      if (response?.data?.status) {
        const total = Number(response?.data?.data?.totalItems || 0);
        const incoming = (response?.data?.data?.data || []) as ApiItem[];
        const mapped = incoming.map((item) => mapApiItemToProduct(item, slug));

        setProviderStatus(!!response?.data?.data?.providerStatus);
        if (pageNo === 1 && response?.data?.data?.maxTimeToShip) {
          setMaxTimeToShip(response.data.data.maxTimeToShip);
        }
        setTotalItems(total);
        setNoProducts(false);
        setNoData(false);
        setPage(pageNo + 1);

        setProducts((prev) => {
          const merged = replace ? mapped : [...prev, ...mapped];
          const sorted = sortProducts(merged, sortBy);
          setNoProducts(sorted.length >= total);
          return sorted;
        });
      } else {
        setNoProducts(true);
        if (pageNo === 1) {
          setProducts([]);
          setNoData(true);
        }
      }
    } catch (err) {
      console.error("fetchStoresData items error:", err);
      setNoProducts(true);
      if (pageNo === 1) {
        setProducts([]);
        setNoData(true);
      }
    } finally {
      setLoading(false);
      setProductLoading(false);
    }
  };

  const handleShare = async () => {
    const buyerWebUrl =
      process.env.NEXT_PUBLIC_BUYER_WEB_URL || "https://retail-buyer-web.nearshop.in";
    const params = new URLSearchParams({
      providerId: finalProviderId,
      providerLocationId: finalProviderLocationId,
      category: finalCategory || mappedCategory || category,
      storeLat: String(resolvedGpsLatitude),
      storeLong: String(resolvedGpsLongitude),
    });
    const shareUrl = `${buyerWebUrl}/store?${params.toString()}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: resolvedShopName, url: shareUrl });
      } catch {
        // user cancelled
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  };

  useEffect(() => {
    if (!addedToCartHere && cartTotalAmount !== mountCartTotalRef.current) {
      setAddedToCartHere(true);
    }
  }, [cartTotalAmount]);


  useEffect(() => {
    if (!accessToken) return;
    if (providerId && providerLocationId) {
      void fetchStoreSubCategories(providerId, providerLocationId);
    }
  }, [
    providerId,
    providerLocationId,
    resolvedGpsLatitude,
    resolvedGpsLongitude,
    accessToken,
  ]);

  useEffect(() => {
    if (!showFoodTypeFilter) {
      setVegFilter(false);
      setNonVegFilter(false);
    }
  }, [showFoodTypeFilter]);

  useEffect(() => {
    if (!accessToken) return;
    if (!storeInfoLoaded) return;
    if (
      !finalProviderId ||
      !finalProviderLocationId ||
      !finalCategory ||
      !selectedSubCategory
    ) {
      return;
    }

    setPage(1);
    setNoProducts(false);
    setNoData(false);
    void fetchItems(1, true);
  }, [
    accessToken,
    storeInfoLoaded,
    finalProviderId,
    finalProviderLocationId,
    selectedSubCategory,
    searchText,
    vegFilter,
    nonVegFilter,
    sortBy,
    category,
    finalCategory,
  ]);

  useEffect(() => {
    const node = observerRef.current;
    if (!node) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (
          first.isIntersecting &&
          !productLoading &&
          !noProducts &&
          products.length > 0
        ) {
          void fetchItems(page, false);
        }
      },
      {
        root: null,
        rootMargin: "200px",
        threshold: 0.01,
      },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [
    productLoading,
    noProducts,
    page,
    products.length,
    selectedSubCategory,
    searchText,
    vegFilter,
    nonVegFilter,
    sortBy,
  ]);

  const showLoader = productLoading && products.length === 0;
  const deliveryLabel = maxTimeToShip || "30-45 mins";

  return (
    <section className={styles.wrapper}>
      <header className={styles.mobileHeader}>
        <BackButton label="Expore Other Stores" />
      </header>

      <div className={styles.storeCardShell}>
        {!storeInfoLoaded ? (
          <div className={styles.skeletonStoreCard}>
            {/* Row 1 skeleton: image + body */}
            <div className={styles.skeletonStoreHeader}>
              <div className={styles.skeletonStoreImg} />
              <div className={styles.skeletonStoreBody}>
                <div
                  style={{
                    display: "flex",
                    gap: "0.42rem",
                    alignItems: "center",
                  }}
                >
                  <div
                    className={styles.skeletonLine}
                    style={{ width: "50%" }}
                  />
                  <div
                    className={styles.skeletonChip}
                    style={{ width: 68, height: 20 }}
                  />
                </div>
                <div
                  className={styles.skeletonLineSm}
                  style={{ width: "78%" }}
                />
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <div
                    className={styles.skeletonLineSm}
                    style={{ width: 58 }}
                  />
                  <div
                    className={styles.skeletonLineSm}
                    style={{ width: 82 }}
                  />
                </div>
              </div>
            </div>
            {/* Row 2 skeleton: tags */}
            <div className={styles.skeletonTagsRow}>
              <div
                className={styles.skeletonChip}
                style={{ width: 94, height: 26, borderRadius: 8 }}
              />
              <div
                className={styles.skeletonChip}
                style={{ width: 74, height: 26, borderRadius: 8 }}
              />
            </div>
            {/* Row 3 skeleton: footer */}
            <div className={styles.skeletonFooterRow}>
              <div
                className={styles.skeletonChip}
                style={{ width: 54, height: 22, borderRadius: 999 }}
              />
              <div className={styles.skeletonLineSm} style={{ width: 110 }} />
            </div>
          </div>
        ) : (
          <div className={styles.storeCard}>
            {/* Row 1: image + name / address / contact */}
            <div className={styles.storeHeader}>
              <img
                src={resolvedShopImage}
                alt={resolvedShopName}
                className={styles.storeImage}
                loading="eager"
                decoding="async"
              />
              <div className={styles.storeBody}>
                <div className={styles.storeNameRow}>
                  <h2 className={styles.storeName}>{resolvedShopName}</h2>
                  {storeInfo?.verified && (
                    <span className={styles.verifiedBadge}>✓ Verified</span>
                  )}
                  <button
                    type="button"
                    className={styles.shareButton}
                    onClick={handleShare}
                    aria-label="Share store"
                    title={shareCopied ? "Link copied!" : "Share store"}
                  >
                    {shareCopied ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                      </svg>
                    )}
                    <span>{shareCopied ? "Copied!" : "Share"}</span>
                  </button>
                </div>
                {resolvedDescription ? (
                  <p className={styles.storeAddress}>{resolvedDescription}</p>
                ) : null}
                <div className={styles.storeMetaInline}>
                  {resolvedDistance && resolvedDistance !== "-" && (
                    <span className={styles.distanceTag}>
                      📍 {resolvedDistance}
                    </span>
                  )}
                  {storeInfo?.provider_contact_no && (
                    <a
                      href={`tel:${storeInfo.provider_contact_no}`}
                      className={styles.contactLink}
                    >
                      📞 {storeInfo.provider_contact_no}
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Row 2: subcategory chips + offer badge — commented out for now */}
            {/* {((storeInfo?.provider_subcategories?.length ?? 0) > 0 ||
            (storeInfo?.provider_offers?.length ?? 0) > 0) && (
            <div className={styles.storeTagsRow}>
              {storeInfo?.provider_subcategories?.map((sub) => (
                <span key={sub} className={styles.subCatTag}>{sub}</span>
              ))}
              {storeInfo?.provider_offers && storeInfo.provider_offers.length > 0 && (
                <span className={styles.offerTag}>
                  🏷️ {storeInfo.provider_offers.length} Offer{storeInfo.provider_offers.length > 1 ? "s" : ""}
                </span>
              )}
            </div>
          )} */}

            {/* Row 3: status footer */}
            <div className={styles.storeFooter}>
              <span
                className={isStoreOpen ? styles.openPill : styles.closedPill}
              >
                {isStoreOpen ? "Open" : "Closed"}
              </span>
              <span className={styles.footerDot}>•</span>
              <span
                className={
                  serviceable ? styles.deliverable : styles.notDelivering
                }
              >
                {serviceable
                  ? `Delivery in ${deliveryLabel} mins`
                  : "Not serviceable"}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <svg
            className={styles.searchIcon}
            aria-hidden
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search products..."
            aria-label="Search store items"
          />
        </div>

        <div className={styles.filterRow}>
          <div className={styles.chips}>
            {!storeInfoLoaded
              ? [72, 96, 64, 88, 76].map((w, i) => (
                  <div
                    key={i}
                    className={styles.skeletonChip}
                    style={{ width: w }}
                  />
                ))
              : subCategoryData.map((subCat) => (
                  <button
                    key={subCat.subCategoryName}
                    type="button"
                    className={
                      selectedSubCategory === subCat.subCategoryName
                        ? styles.activeChip
                        : styles.chip
                    }
                    onClick={() =>
                      setSelectedSubCategory(subCat.subCategoryName)
                    }
                  >
                    {subCat.subCategoryName}
                  </button>
                ))}
          </div>

          <div className={styles.selectors}>
            {showFoodTypeFilter ? (
              <div className={styles.foodToggleGroup}>
                <button
                  type="button"
                  className={`${styles.foodToggleBtn} ${vegFilter ? styles.foodToggleBtnVegActive : ""}`}
                  onClick={() => {
                    setVegFilter((v) => !v);
                    setNonVegFilter(false);
                  }}
                  aria-pressed={vegFilter}
                >
                  <span
                    className={`${styles.foodTypeIcon} ${styles.foodTypeIconVeg}`}
                  />
                  Veg
                </button>
                <button
                  type="button"
                  className={`${styles.foodToggleBtn} ${nonVegFilter ? styles.foodToggleBtnNonVegActive : ""}`}
                  onClick={() => {
                    setNonVegFilter((v) => !v);
                    setVegFilter(false);
                  }}
                  aria-pressed={nonVegFilter}
                >
                  <span
                    className={`${styles.foodTypeIcon} ${styles.foodTypeIconNonVeg}`}
                  />
                  Non-Veg
                </button>
              </div>
            ) : null}
            <select
              value={sortBy}
              onChange={(event) =>
                setSortBy(
                  event.target.value as
                    | "RELEVANCE"
                    | "PRICE_LOW_TO_HIGH"
                    | "PRICE_HIGH_TO_LOW",
                )
              }
            >
              <option value="RELEVANCE">Relevance</option>
              <option value="PRICE_LOW_TO_HIGH">Price low to high</option>
              <option value="PRICE_HIGH_TO_LOW">Price high to low</option>
            </select>
          </div>
        </div>

        {products.length > 0 ? (
          <p className={styles.resultHint}>
            Showing {products.length} of {totalItems} items
          </p>
        ) : null}
      </div>

      {showLoader ? (
        <div className={styles.grid}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className={styles.skeletonCard}
              style={{ animationDelay: `${i * 45}ms` }}
            >
              <div className={styles.skeletonCardImg} />
              <div className={styles.skeletonCardBody}>
                <div
                  className={styles.skeletonLineSm}
                  style={{ width: "46%" }}
                />
                <div className={styles.skeletonLine} style={{ width: "84%" }} />
                <div
                  className={styles.skeletonLineSm}
                  style={{ width: "66%" }}
                />
                <div className={styles.skeletonPriceRow}>
                  <div
                    className={styles.skeletonLine}
                    style={{ width: "38%" }}
                  />
                  <div className={styles.skeletonBtn} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {!showLoader ? (
        <div className={`${styles.grid} ${styles.gridFadeIn}`}>
          {products.map((product) => (
            <article
              key={product.id}
              className={`${styles.card}${!isStoreOpen ? ` ${styles.cardDisabled}` : ""}`}
            >
              <div className={styles.imageWrap}>
                <img
                  src={product.image}
                  alt={product.name}
                  className={styles.image}
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div className={styles.body}>
                <p className={styles.unitTag}>
                  {product.subCategoryName || "1 PCS"}
                </p>
                <h2 className={styles.productName}>{product.name}</h2>
                <ProductTypeBadge foodType={product.foodType} />
                <p className={styles.productDescription}>
                  {product.description}
                </p>
                {!isFoodAndBeverageCategory ? (
                  <div className={styles.meta}>
                    <Link
                      href={{
                        pathname: `/products/${product.slug}`,
                        query: {
                          id: product.id,
                          providerId: finalProviderId,
                          providerLocationId: finalProviderLocationId,
                          parentItemId: product.parentItemId || "",
                          category: finalCategory || mappedCategory || "",
                          subCategoryName:
                            product.subCategoryName ||
                            selectedSubCategory ||
                            "",
                          shopName: resolvedShopName,
                          shopImage: resolvedShopImage,
                          distance: resolvedDistance,
                          serviceable: String(serviceable),
                        },
                      }}
                    >
                      Details
                    </Link>
                  </div>
                ) : null}
                <div className={styles.priceRow}>
                  <div className={styles.priceStack}>
                    <span className={styles.price}>
                      {formatCurrency(product.price)}
                    </span>
                    {product.hasVariants ? (
                      <span className={styles.variantHint}>Customisable</span>
                    ) : null}
                  </div>
                  <AddToCartButton
                    product={product}
                    useServerCart
                    storeDisabled={!isStoreOpen}
                  />
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {noData ? (
        <div className={styles.pagination}>
          <span>No products found.</span>
        </div>
      ) : null}

      {productLoading && products.length > 0 ? (
        <div className={styles.pagination}>
          <div className={styles.loaderSmall} />
          <span>Loading more products...</span>
        </div>
      ) : null}

      <div ref={observerRef} className={styles.scrollSentinel} />

      {noProducts && products.length > 0 ? (
        <div className={styles.pagination}>
          <span>All products loaded.</span>
        </div>
      ) : null}

      {!loading && !providerStatus ? (
        <div className={styles.pagination}>
          <span>This provider is currently unavailable.</span>
        </div>
      ) : null}

      {addedToCartHere && cartTotalAmount > 0 ? (
        <div className={styles.viewCartBar}>
          <div className={styles.viewCartInfo}>
            <span className={styles.viewCartCount}>
              {cartLength} {cartLength === 1 ? "item" : "items"}
            </span>
            <span className={styles.viewCartAmount}>
              ₹{cartTotalAmount.toLocaleString("en-IN")}
            </span>
          </div>
          <button
            type="button"
            className={styles.viewCartButton}
            onClick={() =>
              router.push(
                cartId
                  ? `/cart/view?cartId=${encodeURIComponent(cartId)}`
                  : "/cart",
              )
            }
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            View Cart
          </button>
        </div>
      ) : null}
    </section>
  );
}
