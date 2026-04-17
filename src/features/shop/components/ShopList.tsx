import Link from "next/link";
import { Shop } from "@/features/shop/domain/shop";

type ShopListProps = {
  shops: Shop[];
};

export function ShopList({ shops }: ShopListProps) {
  return (
    <section className="grid cards-grid">
      {shops.map((shop) => (
        <article key={shop.id} className="card">
          <p className="eyebrow">{shop.category}</p>
          <h2>{shop.name}</h2>
          <p>{shop.description}</p>
          <Link href={`/shops/${shop.slug}`} className="button button-secondary">
            Open Store
          </Link>
        </article>
      ))}
    </section>
  );
}
