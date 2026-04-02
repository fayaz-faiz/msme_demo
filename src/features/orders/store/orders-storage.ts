import type { Order } from "@/features/orders/domain/order";

const ORDERS_STORAGE_KEY = "msme-orders";

export function loadOrdersFromStorage(): Order[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(ORDERS_STORAGE_KEY);

  if (!raw) {
    return [];
  }

  try {
    return JSON.parse(raw) as Order[];
  } catch {
    return [];
  }
}

export function saveOrdersToStorage(items: Order[]) {
  window.localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(items));
}
