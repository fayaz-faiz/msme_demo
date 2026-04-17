import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Product } from "@/features/product/domain/product";
import { CartItem } from "@/features/cart/domain/cart-item";

type CartState = {
  items: CartItem[];
};

const initialState: CartState = {
  items: [],
};

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    hydrateCart(_state, action: PayloadAction<CartItem[]>) {
      return {
        items: action.payload,
      };
    },
    addItem(state, action: PayloadAction<Product>) {
      const existing = state.items.find((item) => item.productId === action.payload.id);

      if (existing) {
        existing.quantity += 1;
        return;
      }

      state.items.push({
        productId: action.payload.id,
        slug: action.payload.slug,
        name: action.payload.name,
        price: action.payload.price,
        image: action.payload.image,
        quantity: 1,
      });
    },
    setItemQuantity(state, action: PayloadAction<{ product: Product; quantity: number }>) {
      const { product, quantity } = action.payload;
      const existing = state.items.find((item) => item.productId === product.id);

      if (quantity <= 0) {
        state.items = state.items.filter((item) => item.productId !== product.id);
        return;
      }

      if (existing) {
        existing.quantity = quantity;
        return;
      }

      state.items.push({
        productId: product.id,
        slug: product.slug,
        name: product.name,
        price: product.price,
        image: product.image,
        quantity,
      });
    },
    increaseQuantity(state, action: PayloadAction<{ productId: string }>) {
      const item = state.items.find((entry) => entry.productId === action.payload.productId);

      if (item) {
        item.quantity += 1;
      }
    },
    decreaseQuantity(state, action: PayloadAction<{ productId: string }>) {
      const item = state.items.find((entry) => entry.productId === action.payload.productId);

      if (!item) {
        return;
      }

      if (item.quantity <= 1) {
        state.items = state.items.filter((entry) => entry.productId !== action.payload.productId);
        return;
      }

      item.quantity -= 1;
    },
    removeItem(state, action: PayloadAction<{ productId: string }>) {
      state.items = state.items.filter((entry) => entry.productId !== action.payload.productId);
    },
    clearCart(state) {
      state.items = [];
    },
  },
});

export const {
  hydrateCart,
  addItem,
  setItemQuantity,
  increaseQuantity,
  decreaseQuantity,
  removeItem,
  clearCart,
} = cartSlice.actions;

export const cartReducer = cartSlice.reducer;
