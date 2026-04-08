"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDefaultReducer } from "smh-react-typescript-hooks";
import { getCategoryData, postSearchStoreByLocationWeb } from "@/api";
import { useAppSelector } from "@/features/cart/store/hooks";
import { useLocation } from "@/features/location/context/location-context";
import { Shop } from "@/features/shop/domain/shop";
import styles from "./ShopBrowser.module.css";

type ShopBrowserProps = {
  shops?: Shop[];
};

type ApiStore = {
  _id?: string;
  provider_id?: string;
  provider_location_id?: string;
  provider_name?: string;
  provider_city?: string;
  provider_street?: string;
  category?: string;
  provider_subcategories?: string[];
  bpp_provider_symbol?: string;
  distance?: string;
  verified?: boolean;
  serviceable?: boolean;
};

type CategoryItem = {
  _id: string;
  name: string;
  url: string;
  enabled: boolean;
};

const PAGE_SIZE = 12;
const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80";
const FALLBACK_ACCENTS = ["#2f855a", "#2b6cb0", "#b7791f", "#c05621", "#2c7a7b", "#975a16"];

const initialState: { data: CategoryItem[] } = {
  data: [],
};

const toSlug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const pickAccent = (seed: string) => {
  const total = seed.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return FALLBACK_ACCENTS[total % FALLBACK_ACCENTS.length];
};

const mapApiStoreToShop = (store: ApiStore): Shop => {
  const name = store.provider_name?.trim() || "Local Store";
  const id = store._id || store.provider_id || store.provider_location_id || name;
  const distance = store.distance?.trim() || "25-35 min";
  const category = store.provider_subcategories?.[0] || store.category || "Store";
  const description = [store.provider_street, store.provider_city].filter(Boolean).join(", ") || "Nearby store";

  return {
    id,
    slug: `${toSlug(name)}-${toSlug(id).slice(0, 8)}`,
    name,
    category,
    description,
    rating: store.verified ? 4.8 : 4.5,
    deliveryTime: distance,
    image: store.bpp_provider_symbol || FALLBACK_IMAGE,
    accent: pickAccent(id),
    providerId: store.provider_id,
    providerLocationId: store.provider_location_id,
    verified: !!store.verified,
    serviceable: !!store.serviceable,
    distance: store.distance,
  };
};

export function ShopBrowser({ shops = [] }: ShopBrowserProps) {
  const { state, multipleAction } = useDefaultReducer(initialState);
  const { data } = state;
  const categoryData = (data || []) as CategoryItem[];

  const { location } = useLocation();
  const accessToken = useAppSelector((reduxState) => reduxState.apiResponse.accessToken);

  const [query, setQuery] = useState("");
  const [storeSearch, setStoreSearch] = useState("");
  const [stores, setStores] = useState<Shop[]>(shops);
  const [storeLoading, setStoreLoading] = useState(false);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [storeFound, setStoreFound] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [activeCategory, setActiveCategory] = useState("");
  const [verified] = useState(false);

  const observerRef = useRef<HTMLDivElement | null>(null);

  const enabledCategories = useMemo(() => categoryData.filter((item) => item.enabled), [categoryData]);

  const resolveCoordinates = async () => {
    let gpsLongitude = Number(location?.lng);
    let gpsLatitude = Number(location?.lat);

    if (!Number.isFinite(gpsLongitude) || !Number.isFinite(gpsLatitude)) {
      try {
        const coords = await new Promise<{ lng: number; lat: number }>((resolve, reject) => {
          if (!navigator.geolocation) {
            reject(new Error("Geolocation unavailable"));
            return;
          }
          navigator.geolocation.getCurrentPosition(
            (position) =>
              resolve({
                lng: position.coords.longitude,
                lat: position.coords.latitude,
              }),
            (error) => reject(error),
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 60000,
            },
          );
        });
        gpsLongitude = coords.lng;
        gpsLatitude = coords.lat;
      } catch {
        gpsLongitude = 77.5946;
        gpsLatitude = 12.9716;
      }
    }

    return { gpsLongitude, gpsLatitude };
  };

  const fetchStoresData = async (targetPage: number, replace = false) => {
    if (!accessToken || !activeCategory) {
      return;
    }

    const { gpsLatitude, gpsLongitude } = await resolveCoordinates();

    const requestPayload = {
      gpsLatitude,
      gpsLongitude,
      categoryName: activeCategory,
      page: targetPage,
      pageSize: PAGE_SIZE,
      searchText: storeSearch.trim(),
      verified,
    };

    if (replace) {
      setStores([]);
    }

    setStoreLoading(true);

    try {
      const result = await postSearchStoreByLocationWeb(requestPayload);
      if (result?.data?.status) {
        const total = Number(result?.data?.data?.totalCount || 0);
        const incoming = (result?.data?.data?.data || []) as ApiStore[];
        const mapped = incoming.map(mapApiStoreToShop);

        setStoreFound(true);
        setPage(targetPage);
        setTotalCount(total);

        setStores((prev) => {
          const base = replace ? [] : prev;
          const unique = new Map<string, Shop>();
          [...base, ...mapped].forEach((item) => unique.set(item.id, item));
          const combined = Array.from(unique.values());
          setHasMore(combined.length < total);
          return combined;
        });
      } else {
        if (replace) {
          setStores([]);
        }
        setStoreFound(false);
        setHasMore(false);
      }
    } catch (error) {
      console.error("fetchStoresData error:", error);
      if (replace) {
        setStores([]);
      }
      setStoreFound(false);
      setHasMore(false);
    } finally {
      setStoreLoading(false);
    }
  };

  const getCategoryApi = async () => {
    if (!accessToken) {
      return;
    }

    setCategoryLoading(true);
    try {
      const resp = await getCategoryData();
      const isSuccess = resp?.statusCode === 200 || resp?.status === true;
      if (isSuccess && resp?.data !== undefined) {
        multipleAction({ data: resp.data as CategoryItem[] });
      }
    } catch (error) {
      console.error("getCategoryApi error:", error);
    } finally {
      setCategoryLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => setStoreSearch(query), 350);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    void getCategoryApi();
  }, [accessToken]);

  useEffect(() => {
    if (enabledCategories.length === 0) {
      return;
    }

    const firstCategory = enabledCategories[0].name;
    if (!activeCategory || !enabledCategories.some((item) => item.name === activeCategory)) {
      setActiveCategory(firstCategory);
    }
  }, [enabledCategories, activeCategory]);

  useEffect(() => {
    if (!activeCategory) {
      return;
    }

    setHasMore(true);
    setPage(1);
    setTotalCount(0);
    void fetchStoresData(1, true);
  }, [activeCategory, storeSearch, location?.lat, location?.lng, accessToken]);

  useEffect(() => {
    const node = observerRef.current;
    if (!node) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && hasMore && !storeLoading && activeCategory) {
          void fetchStoresData(page + 1, false);
        }
      },
      {
        root: null,
        rootMargin: "220px",
        threshold: 0.01,
      },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, storeLoading, page, activeCategory, storeSearch, location?.lat, location?.lng, accessToken]);

  const filteredShops = useMemo(() => {
    const search = query.trim().toLowerCase();
    return stores.filter((shop) => {
      const matchesSearch = [shop.name, shop.category, shop.description].join(" ").toLowerCase().includes(search);
      return matchesSearch;
    });
  }, [stores, query]);

  const showFullLoader = storeLoading && stores.length === 0;

  return (
    <section className={styles.wrapper}>
      {/* <div className={styles.headerCard}>
        <div>
          <h1>Browse Shops</h1>
          <p>Search stores, inspect ratings, and jump into the item catalog with one click.</p>
        </div>
        <div className={styles.stats}>
          <span>{filteredShops.length} stores</span>
          <span>{storeLoading ? "Loading from server..." : `Total: ${totalCount}`}</span>
        </div>
      </div> */}
      <h2>Shop by categories</h2>
      <div className={styles.toolbar}>
        <div className={styles.filters} aria-label="Store categories">
          {enabledCategories.map((category) => (
            <button
              key={category._id}
              type="button"
              className={activeCategory === category.name ? styles.activeFilter : styles.filterButton}
              onClick={() => setActiveCategory(category.name)}
            >
              <img src={category.url || FALLBACK_IMAGE} alt={category.name} className={styles.categoryThumb} />
              <span>{category.name}</span>
            </button>
          ))}
        </div>
        <h2>Nearby Shops</h2>
        <div className={styles.searchBox}>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search for a shop, category, or cuisine"
            aria-label="Search shops"
          />
        </div>
        {/* <p className={styles.resultHint}>
          {categoryLoading ? "Loading categories..." : `Selected category: ${activeCategory || "-"}`}
        </p> */}
      </div>

      {showFullLoader ? (
        <div className={styles.loaderWrap}>
          <div className={styles.loader} />
          <p>Fetching stores from server...</p>
        </div>
      ) : null}

      {!showFullLoader ? (
        <div className={styles.grid}>
          {filteredShops.map((shop) => (
            <article key={shop.id} className={styles.card}>
              <div className={styles.imageWrap} style={{ "--accent": shop.accent } as CSSProperties}>
                <img src={shop.image} alt={shop.name} className={styles.image} loading="lazy" decoding="async" />
                <div className={styles.overlay} />
                <div className={styles.badge}>{shop.category}</div>
              </div>
              <div className={styles.body}>
                <div className={styles.cardTop}>
                  <h2>{shop.name}</h2>
                  <span className={styles.rating}>{shop.rating.toFixed(1)} ★</span>
                </div>
                <p>{shop.description}</p>
                <div className={styles.meta}>
                  <span>{shop.deliveryTime}</span>
                  <span className={shop.serviceable ? styles.deliverable : styles.notDelivering}>
                    {shop.serviceable ? "Deliverable" : "Currently not delivering"}
                  </span>
                </div>
                <Link
                  href={`/shops/${shop.slug}?providerId=${encodeURIComponent(
                    shop.providerId || "",
                  )}&providerLocationId=${encodeURIComponent(
                    shop.providerLocationId || "",
                  )}&category=${encodeURIComponent(activeCategory)}&shopName=${encodeURIComponent(
                    shop.name,
                  )}&shopImage=${encodeURIComponent(shop.image)}&distance=${encodeURIComponent(
                    shop.deliveryTime,
                  )}&serviceable=${encodeURIComponent(String(!!shop.serviceable))}`}
                  className={styles.openButton}
                >
                  Open Store
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {!storeLoading && filteredShops.length === 0 ? (
        <div className={styles.pagination}>
          <span>No stores found for this category/search.</span>
        </div>
      ) : null}

      {storeLoading && stores.length > 0 ? (
        <div className={styles.pagination}>
          <div className={styles.loaderSmall} />
          <span>Loading more stores...</span>
        </div>
      ) : null}

      <div ref={observerRef} className={styles.scrollSentinel} />

      {!hasMore && filteredShops.length > 0 ? (
        <div className={styles.pagination}>
          <span>All stores loaded.</span>
        </div>
      ) : null}
    </section>
  );
}
