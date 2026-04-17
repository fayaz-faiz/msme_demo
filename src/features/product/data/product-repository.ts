import { Product } from "@/features/product/domain/product";

const products: Product[] = [
  {
    id: "product-1",
    slug: "canvas-bomber-jacket",
    shopSlug: "urban-threads",
    name: "Canvas Bomber Jacket",
    description: "Lightweight bomber jacket with organic cotton lining.",
    hasVariants: true,
    price: 890,
    stock: 12,
    image:
      "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "product-2",
    slug: "single-origin-kit",
    shopSlug: "north-roast",
    name: "Single Origin Starter Kit",
    description: "Handpicked beans and accessories for pour-over lovers.",
    hasVariants: true,
    price: 565,
    stock: 20,
    image:
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "product-3",
    slug: "ergonomic-laptop-stand",
    shopSlug: "pixel-desk",
    name: "Ergonomic Laptop Stand",
    description: "Aluminum stand with adjustable height and cable channel.",
    price: 428,
    stock: 35,
    image:
      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "product-4",
    slug: "minimal-hoodie",
    shopSlug: "urban-threads",
    name: "Minimal Hoodie",
    description: "Relaxed fit hoodie with recycled fleece interior.",
    hasVariants: true,
    price: 640,
    stock: 18,
    image:
      "https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "product-5",
    slug: "spice-thali-box",
    shopSlug: "spice-route",
    name: "Signature Thali Box",
    description: "Hearty lunch thali with rice, curry, and dessert.",
    foodType: "veg",
    price: 185,
    stock: 30,
    image:
      "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "product-6",
    slug: "green-bowl-protein",
    shopSlug: "bistro-verde",
    name: "Protein Power Bowl",
    description: "Grain bowl with roasted vegetables and herb dressing.",
    foodType: "veg",
    price: 152,
    stock: 24,
    image:
      "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "product-7",
    slug: "margherita-supreme",
    shopSlug: "pizza-corner",
    name: "Margherita Supreme",
    description: "Classic pizza with basil, mozzarella, and tomato sauce.",
    foodType: "veg",
    price: 210,
    stock: 16,
    image:
      "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "product-8",
    slug: "chaat-mix-box",
    shopSlug: "urban-chaat",
    name: "Crunch Chaat Mix",
    description: "Loaded street-style chaat with chutneys and spices.",
    foodType: "veg",
    price: 98,
    stock: 40,
    image:
      "https://images.unsplash.com/photo-1606755962773-d324e12ad3b6?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "product-9",
    slug: "grocery-fruit-box",
    shopSlug: "green-basket",
    name: "Fresh Fruit Box",
    description: "Seasonal fruit box for quick healthy snacking.",
    foodType: "veg",
    price: 220,
    stock: 14,
    image:
      "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "product-10",
    slug: "pour-over-kit",
    shopSlug: "north-roast",
    name: "Pour Over Kit",
    description: "Dripper, filters, kettle, and tasting notes bundle.",
    hasVariants: true,
    price: 380,
    stock: 10,
    image:
      "https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "product-11",
    slug: "hoodie-blackout",
    shopSlug: "urban-threads",
    name: "Blackout Hoodie",
    description: "Minimal oversized hoodie with premium fleece finish.",
    hasVariants: true,
    price: 720,
    stock: 22,
    image:
      "https://images.unsplash.com/photo-1523398002811-999ca8dec234?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "product-12",
    slug: "desk-lamp-pro",
    shopSlug: "pixel-desk",
    name: "Desk Lamp Pro",
    description: "Warm, adjustable lamp for focused late-night work.",
    price: 485,
    stock: 19,
    image:
      "https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "product-13",
    slug: "spice-bowl-deluxe",
    shopSlug: "spice-route",
    name: "Spice Bowl Deluxe",
    description: "Aromatic rice bowl with chicken tikka and herbs.",
    foodType: "non-veg",
    price: 168,
    stock: 26,
    image:
      "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "product-14",
    slug: "salad-crunch-bowl",
    shopSlug: "bistro-verde",
    name: "Crunch Salad Bowl",
    description: "Crisp veggies, seeds, and citrus dressing.",
    foodType: "veg",
    price: 139,
    stock: 18,
    image:
      "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "product-15",
    slug: "pepperoni-feast",
    shopSlug: "pizza-corner",
    name: "Pepperoni Feast",
    description: "Loaded pizza with extra cheese and spicy pepperoni.",
    foodType: "non-veg",
    price: 245,
    stock: 11,
    image:
      "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "product-16",
    slug: "chaat-party-platter",
    shopSlug: "urban-chaat",
    name: "Chaat Party Platter",
    description: "Mixed chaat platter with sev, chutney, and crunch.",
    foodType: "veg",
    price: 122,
    stock: 30,
    image:
      "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "product-17",
    slug: "organic-veggie-crate",
    shopSlug: "green-basket",
    name: "Organic Veggie Crate",
    description: "Daily vegetables sourced from local farms.",
    foodType: "veg",
    price: 195,
    stock: 28,
    image:
      "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "product-18",
    slug: "berry-cheesecake",
    shopSlug: "sweet-crate",
    name: "Berry Cheesecake",
    description: "Creamy cheesecake with fresh berry topping.",
    foodType: "veg",
    price: 275,
    stock: 15,
    image:
      "https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "product-19",
    slug: "chocolate-brownie-box",
    shopSlug: "sweet-crate",
    name: "Chocolate Brownie Box",
    description: "Warm brownies with rich cocoa and nuts.",
    foodType: "veg",
    price: 245,
    stock: 18,
    image:
      "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "product-20",
    slug: "classic-cheeseburger",
    shopSlug: "burger-bay",
    name: "Classic Cheeseburger",
    description: "Juicy burger with cheese, lettuce, and special sauce.",
    foodType: "non-veg",
    price: 210,
    stock: 22,
    image:
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "product-21",
    slug: "loaded-fries",
    shopSlug: "burger-bay",
    name: "Loaded Fries",
    description: "Crispy fries topped with cheese and sauce.",
    foodType: "veg",
    price: 145,
    stock: 26,
    image:
      "https://images.unsplash.com/photo-1576107232684-1279f390859f?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "product-22",
    slug: "salmon-sushi-box",
    shopSlug: "sushi-wave",
    name: "Salmon Sushi Box",
    description: "Assorted salmon sushi and nigiri selection.",
    foodType: "non-veg",
    price: 420,
    stock: 14,
    image:
      "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "product-23",
    slug: "ramen-comfort-bowl",
    shopSlug: "sushi-wave",
    name: "Ramen Comfort Bowl",
    description: "Warm broth with noodles, egg, and vegetables.",
    foodType: "non-veg",
    price: 315,
    stock: 16,
    image:
      "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "product-24",
    slug: "butter-croissant-pack",
    shopSlug: "bakery-bloom",
    name: "Butter Croissant Pack",
    description: "Freshly baked croissants with soft flaky layers.",
    foodType: "veg",
    price: 165,
    stock: 25,
    image:
      "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "product-25",
    slug: "artisan-bread-bundle",
    shopSlug: "bakery-bloom",
    name: "Artisan Bread Bundle",
    description: "Crusty bread loaf bundle for the breakfast table.",
    foodType: "veg",
    price: 195,
    stock: 19,
    image:
      "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1200&q=80",
  },
];

export async function getProducts(shopSlug?: string): Promise<Product[]> {
  if (!shopSlug) {
    return products;
  }

  return products.filter((product) => product.shopSlug === shopSlug);
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  return products.find((product) => product.slug === slug) ?? null;
}

export async function getProductsByShop(shopSlug: string): Promise<Product[]> {
  return products.filter((product) => product.shopSlug === shopSlug);
}
