import { ShopItemsBrowser } from "@/features/shop/components/ShopItemsBrowser";

type DirectStorePageProps = {
  searchParams?: {
    providerId?: string;
    providerLocationId?: string;
    category?: string;
    shopName?: string;
    shopImage?: string;
    distance?: string;
    serviceable?: string;
    storeLat?: string;
    storeLong?: string;
    storeLng?: string;
  };
};

const toSlug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export default function DirectStorePage({ searchParams }: DirectStorePageProps) {
  const providerId = searchParams?.providerId || "";
  const providerLocationId = searchParams?.providerLocationId || "";
  const shopName = searchParams?.shopName || "Store";
  const slugSeed = searchParams?.shopName || providerId || providerLocationId || "store";

  return (
    <section className="page">
      <ShopItemsBrowser
        slug={toSlug(slugSeed) || "store"}
        providerId={providerId}
        providerLocationId={providerLocationId}
        category={searchParams?.category || ""}
        shopName={shopName}
        shopImage={searchParams?.shopImage || ""}
        distance={searchParams?.distance || ""}
        serviceable={searchParams?.serviceable === "true"}
        storeLat={searchParams?.storeLat || ""}
        storeLong={searchParams?.storeLong || ""}
        storeLng={searchParams?.storeLng || ""}
      />
    </section>
  );
}
