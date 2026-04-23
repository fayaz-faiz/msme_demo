export type Product = {
  id: string;
  slug: string;
  shopSlug: string;
  name: string;
  description: string;
  foodType?: "veg" | "non-veg";
  hasVariants?: boolean;
  isAvailableInCart?: boolean;
  cartCount?: number;
  price: number;
  stock: number;
  image: string;
};
