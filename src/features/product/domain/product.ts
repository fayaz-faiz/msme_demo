export type Product = {
  id: string;
  slug: string;
  shopSlug: string;
  name: string;
  description: string;
  foodType?: "veg" | "non-veg";
  hasVariants?: boolean;
  price: number;
  stock: number;
  image: string;
};
