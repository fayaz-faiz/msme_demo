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
import styles from "./page.module.css";

type ApiFoodType = {
  veg?: string | null;
  non_veg?: string | null;
};

type ApiProductItem = {
  _id?: string;
  item_id?: string;
  parent_item_id?: string;
  sub_category?: string;
  item_name?: string;
  item_short_desc?: string;
  item_long_desc?: string;
  item_symbol?: string;
  item_images?: string[];
  item_selling_price?: number;
  item_available_count?: string | number;
  item_measure_value?: string | number;
  item_measure_quantity?: string;
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
};

type ProductDetailsApiResponse = {
  updated_results?: ApiProductItem;
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

const toProduct = (item: ApiProductItem | null, slug: string, fallbackId: string): Product | null => {
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
    stock: Number(item.item_available_count || 0),
    image: item.item_images?.[0] || item.item_symbol || DEFAULT_IMAGE,
  };
};

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

  const lastFetchKeyRef = useRef("");

  const product = useMemo(() => toProduct(details, slug, id), [details, id, slug]);

  useEffect(() => {
    if (!id || !providerId) {
      setLoading(false);
      setError("Missing product details context. Please open this screen from a store product card.");
      return;
    }

    const gpsLatitude = Number(location?.lat ?? 12.9716);
    const gpsLongitude = Number(location?.lng ?? 77.5946);
    const fetchKey = [id, providerId, parentItemId, gpsLatitude, gpsLongitude].join("|");

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
          id,
          parent_item_id: parentItemId,
          provider_id: providerId,
          gpsLongitude,
          gpsLatitude,
        };

        const detailsResponse = (await postSearchById(detailsPayload)) as PostSearchByIdResponse;
        const detailsData: ProductDetailsApiResponse = detailsResponse?.data?.data || {};
        const updated = detailsData?.updated_results || null;

        if (!detailsResponse?.data?.status || !updated) {
          setDetails(null);
          setError("Unable to load product details right now.");
          return;
        }

        setDetails(updated);

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
            setRelatedItems(incoming.filter((item) => (item._id || item.item_id) !== id));
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
  }, [category, id, location?.lat, location?.lng, parentItemId, providerId, providerLocationId, subCategoryName]);

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
              <p className={styles.price}>{formatCurrency(product.price)}</p>

              <div className={styles.measureRow}>
                <span>
                  Qty: {details.item_measure_value || "-"} {details.item_measure_quantity || ""}
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
                          <span>{formatCurrency(relatedProduct.price)}</span>
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

