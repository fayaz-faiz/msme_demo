import { ShopItemsBrowser } from "@/features/shop/components/ShopItemsBrowser";

type ShopDetailsPageProps = {
  params: {
    slug: string;
  };
  searchParams?: {
    providerId?: string;
    providerLocationId?: string;
    category?: string;
    shopName?: string;
    shopImage?: string;
    distance?: string;
    serviceable?: string;
  };
};

export default function ShopDetailsPage({ params, searchParams }: ShopDetailsPageProps) {
  return (
    <section className="page">
      <ShopItemsBrowser
        slug={params.slug}
        providerId={searchParams?.providerId || ""}
        providerLocationId={searchParams?.providerLocationId || ""}
        category={searchParams?.category || ""}
        shopName={searchParams?.shopName || params.slug.replace(/-/g, " ")}
        shopImage={searchParams?.shopImage || ""}
        distance={searchParams?.distance || ""}
        serviceable={searchParams?.serviceable === "true"}
      />
    </section>
  );
}
