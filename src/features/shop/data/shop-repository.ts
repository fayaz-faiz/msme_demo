import { Shop } from "@/features/shop/domain/shop";

const shops: Shop[] = [
  {
    id: "shop-8",
    slug: "green-basket",
    name: "Green Basket",
    category: "Grocery",
    description: "Fresh produce, pantry basics, and daily essentials.",
    rating: 4.7,
    deliveryTime: "16-22 min",
    image:
      "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80",
    accent: "#10b981",
  },
  {
    id: "shop-1",
    slug: "urban-threads",
    name: "Urban Threads",
    category: "Fashion",
    description: "Street-ready apparel with sustainable materials.",
    rating: 4.7,
    deliveryTime: "20-25 min",
    image:
      "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=80",
    accent: "#ff6f3c",
  },
  {
    id: "shop-2",
    slug: "north-roast",
    name: "North Roast",
    category: "Coffee",
    description: "Small-batch beans and premium brewing essentials.",
    rating: 4.8,
    deliveryTime: "15-20 min",
    image:
      "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=80",
    accent: "#a0623d",
  },
  {
    id: "shop-3",
    slug: "pixel-desk",
    name: "Pixel Desk",
    category: "Workspace",
    description: "Modern productivity tools for creators and developers.",
    rating: 4.6,
    deliveryTime: "25-30 min",
    image:
      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80",
    accent: "#3b82f6",
  },
  {
    id: "shop-4",
    slug: "spice-route",
    name: "Spice Route Kitchen",
    category: "Indian",
    description: "Comfort food, biryani, and chef specials delivered hot.",
    rating: 4.9,
    deliveryTime: "22-28 min",
    image:
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80",
    accent: "#ff7a18",
  },
  {
    id: "shop-5",
    slug: "bistro-verde",
    name: "Bistro Verde",
    category: "Healthy",
    description: "Fresh salads, bowls, and nourishing daily meals.",
    rating: 4.8,
    deliveryTime: "18-24 min",
    image:
      "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1200&q=80",
    accent: "#22c55e",
  },
  {
    id: "shop-6",
    slug: "pizza-corner",
    name: "Pizza Corner Co.",
    category: "Pizza",
    description: "Wood-fired pizza, pasta, and craveable sides.",
    rating: 4.5,
    deliveryTime: "25-32 min",
    image:
      "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=80",
    accent: "#ef4444",
  },
  {
    id: "shop-7",
    slug: "urban-chaat",
    name: "Urban Chaat House",
    category: "Street Food",
    description: "Crunchy, spicy, tangy street-style favorites.",
    rating: 4.6,
    deliveryTime: "21-27 min",
    image:
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80",
    accent: "#f59e0b",
  },
  {
    id: "shop-9",
    slug: "sweet-crate",
    name: "Sweet Crate",
    category: "Dessert",
    description: "Brownies, cakes, pastries, and dessert boxes.",
    rating: 4.7,
    deliveryTime: "18-23 min",
    image:
      "https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=1200&q=80",
    accent: "#f472b6",
  },
  {
    id: "shop-10",
    slug: "burger-bay",
    name: "Burger Bay",
    category: "Burgers",
    description: "Juicy burgers, loaded fries, and milkshakes.",
    rating: 4.6,
    deliveryTime: "23-29 min",
    image:
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=80",
    accent: "#f59e0b",
  },
  {
    id: "shop-11",
    slug: "sushi-wave",
    name: "Sushi Wave",
    category: "Japanese",
    description: "Fresh sushi rolls, sashimi, and rice bowls.",
    rating: 4.8,
    deliveryTime: "28-34 min",
    image:
      "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=1200&q=80",
    accent: "#06b6d4",
  },
  {
    id: "shop-12",
    slug: "bakery-bloom",
    name: "Bakery Bloom",
    category: "Bakery",
    description: "Fresh breads, croissants, and morning bakes.",
    rating: 4.5,
    deliveryTime: "16-21 min",
    image:
      "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1200&q=80",
    accent: "#d97706",
  },
];

export async function getShops(): Promise<Shop[]> {
  return shops;
}

export async function getShopBySlug(slug: string): Promise<Shop | null> {
  return shops.find((shop) => shop.slug === slug) ?? null;
}
