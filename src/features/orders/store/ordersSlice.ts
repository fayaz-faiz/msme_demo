import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { Order, OrderPaymentStatus } from "@/features/orders/domain/order";

type OrdersState = {
  items: Order[];
};

const initialState: OrdersState = {
  items: [],
};

const ordersSlice = createSlice({
  name: "orders",
  initialState,
  reducers: {
    hydrateOrders(_state, action: PayloadAction<Order[]>) {
      return {
        items: action.payload,
      };
    },
    recordOrder(state, action: PayloadAction<Order>) {
      state.items.unshift(action.payload);
    },
    updateOrderPaymentStatus(
      state,
      action: PayloadAction<{ orderId: string; paymentStatus: OrderPaymentStatus }>,
    ) {
      const order = state.items.find((item) => item.id === action.payload.orderId);

      if (order) {
        order.paymentStatus = action.payload.paymentStatus;
      }
    },
  },
});

export const { hydrateOrders, recordOrder, updateOrderPaymentStatus } = ordersSlice.actions;
export const ordersReducer = ordersSlice.reducer;
