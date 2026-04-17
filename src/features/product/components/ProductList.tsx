import Link from "next/link";
import { AddToCartButton } from "@/features/cart/components/AddToCartButton";
import {
  ProductDescriptionPreview,
  ProductTypeBadge,
} from "@/features/product/components/ProductMeta";
import { formatCurrency } from "@/shared/lib/format-currency";
import { Product } from "@/features/product/domain/product";

type ProductListProps = {
  products: Product[];
};

export function ProductList({ products }: ProductListProps) {
  if (!products.length) {
    return <p className="empty-state">No products found for this shop.</p>;
  }

  return (
    <section className="grid cards-grid">
      {products.map((product) => (
        <article key={product.id} className="card">
          <p className="eyebrow">{product.shopSlug}</p>
          <h2>{product.name}</h2>
          <ProductTypeBadge foodType={product.foodType} />
          <ProductDescriptionPreview
            description={product.description}
            hasVariants={product.hasVariants}
          />
          <p className="price">{formatCurrency(product.price)}</p>
          <div className="stack-row">
            <AddToCartButton product={product} />
            <Link
              href={`/products/${product.slug}`}
              className="button button-secondary"
            >
              Details
            </Link>
          </div>
        </article>
      ))}
    </section>
  );
}
