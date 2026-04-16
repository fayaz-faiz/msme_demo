"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { searchStoreByItems, postStoreSubcatApi } from "@/api";
import { AddToCartButton } from "@/features/cart/components/AddToCartButton";
import { useLocation } from "@/features/location/context/location-context";
import { ProductTypeBadge } from "@/features/product/components/ProductMeta";
import { Product } from "@/features/product/domain/product";
import { formatCurrency } from "@/shared/lib/format-currency";
import styles from "./ShopItemsBrowser.module.css";

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
  const id = item._id || item.item_id || `${shopSlug}-${Math.random().toString(36).slice(2)}`;
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
  const { location } = useLocation();

  const [query, setQuery] = useState("");
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(false);
  const [productLoading, setProductLoading] = useState(false);
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [subCategoryData, setSubCategoryData] = useState<SubCategory[]>([]);
  const [selectedSubCategory, setSelectedSubCategory] = useState("All Items");
  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null);
  const [typeOfFood, setTypeOfFood] = useState<"ALL" | "Veg" | "Non-Veg">("ALL");
  const [sortBy, setSortBy] = useState<"RELEVANCE" | "PRICE_LOW_TO_HIGH" | "PRICE_HIGH_TO_LOW">("RELEVANCE");
  const [page, setPage] = useState(1);
  const [noProducts, setNoProducts] = useState(false);
  const [noData, setNoData] = useState(false);
  const [totalItems, setTotalItems] = useState(0);
  const [providerStatus, setProviderStatus] = useState(true);

  const observerRef = useRef<HTMLDivElement | null>(null);

  const finalProviderId = storeInfo?.provider_id || providerId;
  const finalProviderLocationId = storeInfo?.provider_location_id || providerLocationId;
  const finalCategory = storeInfo?.category || category;
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
  const resolvedShopImage = storeInfo?.bpp_provider_symbol || shopImage || DEFAULT_IMAGE;
  const resolvedDistance = storeInfo?.distance || distance || "-";
  const resolvedDescription = [storeInfo?.provider_street, storeInfo?.provider_city].filter(Boolean).join(", ") || "";
  const showFoodTypeFilter = useMemo(() => {
    const value = String(finalCategory || category || "").toLowerCase().trim();
    if (!value) {
      return false;
    }
    return value === "grocery" || value.includes("f&b") || value.includes("fnb") || value.includes("food & beverage");
  }, [finalCategory, category]);
  const isFoodAndBeverageCategory = useMemo(() => {
    const rawValue = String(finalCategory || category || "").toLowerCase().trim();
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
  }, [finalCategory, category]);

  const fetchStoreSubCategories = async (providerIdParam: string, providerLocationIdParam: string) => {
    const data = {
      gpsLatitude: resolvedGpsLatitude,
      gpsLongitude: resolvedGpsLongitude,
      provider_id: providerIdParam,
      location_id: providerLocationIdParam,
    };

    setLoading(true);
    try {
      const resp = (await postStoreSubcatApi(data)) as StoreSubCategoryApiResponse;
      if (resp?.data?.status) {
        const info = resp?.data?.data?.result || null;
        const subCats = (resp?.data?.data?.availableSubCategories || []) as SubCategory[];

        setStoreInfo(info);
        setSubCategoryData(subCats);
        setSelectedSubCategory(subCats?.[0]?.subCategoryName || "All Items");
      }
    } catch (err) {
      console.error("getStoreSubCatList error:", err);
    } finally {
      setLoading(false);
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
      subCategoryName: selectedSubCategory === "All Items" ? "" : selectedSubCategory,
      page: pageNo,
      pageSize: PAGE_SIZE,
      category: finalCategory,
      veg: showFoodTypeFilter && typeOfFood === "Veg" ? "yes" : "",
      nonVeg: showFoodTypeFilter && typeOfFood === "Non-Veg" ? "yes" : "",
    };

    try {
      const response = (await searchStoreByItems(data)) as SearchStoreItemsApiResponse;
      if (response?.data?.status) {
        const total = Number(response?.data?.data?.totalItems || 0);
        const incoming = (response?.data?.data?.data || []) as ApiItem[];
        const mapped = incoming.map((item) => mapApiItemToProduct(item, slug));

        setProviderStatus(!!response?.data?.data?.providerStatus);
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

  useEffect(() => {
    const timer = setTimeout(() => setSearchText(query.trim()), 350);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (providerId && providerLocationId) {
      void fetchStoreSubCategories(providerId, providerLocationId);
    }
  }, [providerId, providerLocationId, resolvedGpsLatitude, resolvedGpsLongitude]);

  useEffect(() => {
    if (!showFoodTypeFilter && typeOfFood !== "ALL") {
      setTypeOfFood("ALL");
    }
  }, [showFoodTypeFilter, typeOfFood]);

  useEffect(() => {
    if (!finalProviderId || !finalProviderLocationId || !finalCategory || !selectedSubCategory) {
      return;
    }

    setPage(1);
    setNoProducts(false);
    setNoData(false);
    void fetchItems(1, true);
  }, [
    finalProviderId,
    finalProviderLocationId,
    selectedSubCategory,
    searchText,
    typeOfFood,
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
        if (first.isIntersecting && !productLoading && !noProducts && products.length > 0) {
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
  }, [productLoading, noProducts, page, products.length, selectedSubCategory, searchText, typeOfFood, sortBy]);

  const showLoader = productLoading && products.length === 0;
  const deliveryLabel = resolvedDistance && resolvedDistance !== "-" ? resolvedDistance : "30-45 mins";

  return (
    <section className={styles.wrapper}>
      <header className={styles.mobileHeader}>
        <Link href="/shops" className={styles.backCircle} aria-label="Back to shops">
          {"<"}
        </Link>
        <div>
          <h1>Store Products</h1>
          <p>{serviceable ? `Delivery in ${deliveryLabel}` : "Delivery unavailable right now"}</p>
        </div>
      </header>

      <div className={styles.storeCard}>
        <img src={resolvedShopImage} alt={resolvedShopName} className={styles.storeImage} loading="eager" decoding="async" />
        <div className={styles.storeBody}>
          <h2>{resolvedShopName}</h2>
          <p>{resolvedDescription || "Serving your nearby area"}</p>
          <div className={styles.storeMeta}>
            <span>{deliveryLabel}</span>
            <span className={serviceable ? styles.deliverable : styles.notDelivering}>
              {serviceable ? "Serving your area" : "Not serviceable"}
            </span>
            <span>{providerStatus ? "Open" : "Unavailable"}</span>
          </div>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <span className={styles.searchIcon} aria-hidden>
            Search
          </span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search products, brands, or sizes..."
            aria-label="Search store items"
          />
        </div>

        <div className={styles.filterRow}>
          <div className={styles.chips}>
            {subCategoryData.map((subCat) => (
              <button
                key={subCat.subCategoryName}
                type="button"
                className={selectedSubCategory === subCat.subCategoryName ? styles.activeChip : styles.chip}
                onClick={() => setSelectedSubCategory(subCat.subCategoryName)}
              >
                {subCat.subCategoryName}
              </button>
            ))}
          </div>

          <div className={styles.selectors}>
            {showFoodTypeFilter ? (
              <select value={typeOfFood} onChange={(event) => setTypeOfFood(event.target.value as "ALL" | "Veg" | "Non-Veg") }>
                <option value="ALL">All Food</option>
                <option value="Veg">Veg</option>
                <option value="Non-Veg">Non-Veg</option>
              </select>
            ) : null}
            <select
              value={sortBy}
              onChange={(event) =>
                setSortBy(event.target.value as "RELEVANCE" | "PRICE_LOW_TO_HIGH" | "PRICE_HIGH_TO_LOW")
              }
            >
              <option value="RELEVANCE">Relevance</option>
              <option value="PRICE_LOW_TO_HIGH">Price low to high</option>
              <option value="PRICE_HIGH_TO_LOW">Price high to low</option>
            </select>
          </div>
        </div>

        <p className={styles.resultHint}>Showing {products.length} of {totalItems} items</p>
      </div>

      {showLoader ? (
        <div className={styles.loaderWrap}>
          <div className={styles.loader} />
          <p>Fetching items from server...</p>
        </div>
      ) : null}

      {!showLoader ? (
        <div className={styles.grid}>
          {products.map((product) => (
            <article key={product.id} className={styles.card}>
              <div className={styles.imageWrap}>
                <img src={product.image} alt={product.name} className={styles.image} loading="lazy" decoding="async" />
              </div>
              <div className={styles.body}>
                <p className={styles.unitTag}>{product.subCategoryName || "1 PCS"}</p>
                <h2 className={styles.productName}>{product.name}</h2>
                <ProductTypeBadge foodType={product.foodType} />
                <p className={styles.productDescription}>{product.description}</p>
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
                          category: finalCategory || category || "",
                          subCategoryName: product.subCategoryName || selectedSubCategory || "",
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
                    <span className={styles.price}>{formatCurrency(product.price)}</span>
                    {product.hasVariants ? <span className={styles.variantHint}>Customisable</span> : null}
                  </div>
                  <AddToCartButton product={product} useServerCart />
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
    </section>
  );
}

