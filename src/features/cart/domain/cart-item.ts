import { Product } from "@/features/product/domain/product";

export type CartItem = {
  productId: Product["id"];
  slug: Product["slug"];
  name: Product["name"];
  price: Product["price"];
  image: Product["image"];
  quantity: number;
};
