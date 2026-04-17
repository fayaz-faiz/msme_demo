import type { CartItem } from "@/features/cart/domain/cart-item";

export type OrderStatus = "placed" | "packed" | "shipped" | "out-for-delivery" | "delivered";
export type OrderPaymentStatus = "pending" | "success" | "failed" | "cancelled";

export type Order = {
  id: string;
  customerName: string;
  mobileNumber: string;
  deliveryAddress: string;
  items: CartItem[];
  subtotal: number;
  status: OrderStatus;
  paymentStatus: OrderPaymentStatus;
  createdAt: string;
};

export const ORDER_STATUS_STEPS: Array<{
  status: OrderStatus;
  label: string;
}> = [
  { status: "placed", label: "Order placed" },
  { status: "packed", label: "Packed" },
  { status: "shipped", label: "Shipped" },
  { status: "out-for-delivery", label: "Out for delivery" },
  { status: "delivered", label: "Delivered" },
];
