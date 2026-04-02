import { notFound } from "next/navigation";
import { AddToCartButton } from "@/features/cart/components/AddToCartButton";
import { ProductDescriptionPreview, ProductTypeBadge } from "@/features/product/components/ProductMeta";
import { getProductBySlug } from "@/features/product/data/product-repository";
import { formatCurrency } from "@/shared/lib/format-currency";

type ProductDetailsPageProps = {
  params: {
    slug: string;
  };
};

export default async function ProductDetailsPage({ params }: ProductDetailsPageProps) {
  const product = await getProductBySlug(params.slug);

  if (!product) {
    notFound();
  }

  return (
    <section className="page">
      <article className="panel">
        <p className="eyebrow">{product.shopSlug}</p>
        <h1>{product.name}</h1>
        <ProductTypeBadge foodType={product.foodType} />
        <ProductDescriptionPreview description={product.description} hasVariants={product.hasVariants} label="More details" />
        <p className="price">{formatCurrency(product.price)}</p>
        <p>In stock: {product.stock}</p>
        <AddToCartButton product={product} />
      </article>
    </section>
  );
}
