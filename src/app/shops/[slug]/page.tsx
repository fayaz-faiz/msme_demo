import { redirect } from "next/navigation";

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
    storeLat?: string;
    storeLong?: string;
    storeLng?: string;
  };
};

export default function ShopDetailsPage({ params, searchParams }: ShopDetailsPageProps) {
  const query = new URLSearchParams({
    providerId: searchParams?.providerId || "",
    providerLocationId: searchParams?.providerLocationId || "",
    category: searchParams?.category || "",
    shopName: searchParams?.shopName || params.slug.replace(/-/g, " "),
    shopImage: searchParams?.shopImage || "",
    distance: searchParams?.distance || "",
    serviceable: searchParams?.serviceable || "false",
    storeLat: searchParams?.storeLat || "",
    storeLong: searchParams?.storeLong || "",
    storeLng: searchParams?.storeLng || "",
  });

  redirect(`/store?${query.toString()}`);
}
