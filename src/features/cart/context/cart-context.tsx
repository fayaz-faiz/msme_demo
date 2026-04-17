"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from "react";
import { CartItem } from "@/features/cart/domain/cart-item";
import { Product } from "@/features/product/domain/product";

type CartState = {
  items: CartItem[];
};

type CartContextValue = {
  items: CartItem[];
  total: number;
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
};

type CartAction =
  | { type: "ADD_ITEM"; payload: Product }
  | { type: "REMOVE_ITEM"; payload: { productId: string } }
  | { type: "CLEAR" }
  | { type: "HYDRATE"; payload: CartState };

const CART_STORAGE_KEY = "next-shop-cart";

const initialState: CartState = {
  items: [],
};

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "ADD_ITEM": {
      const item = state.items.find((entry) => entry.productId === action.payload.id);

      if (item) {
        return {
          items: state.items.map((entry) =>
            entry.productId === action.payload.id
              ? { ...entry, quantity: entry.quantity + 1 }
              : entry,
          ),
        };
      }

      return {
        items: [
          ...state.items,
          {
            productId: action.payload.id,
            slug: action.payload.slug,
            name: action.payload.name,
            price: action.payload.price,
            image: action.payload.image,
            quantity: 1,
          },
        ],
      };
    }

    case "REMOVE_ITEM": {
      return {
        items: state.items.filter((item) => item.productId !== action.payload.productId),
      };
    }

    case "CLEAR": {
      return initialState;
    }

    case "HYDRATE": {
      return action.payload;
    }

    default:
      return state;
  }
}

const CartContext = createContext<CartContextValue | null>(null);

type CartProviderProps = {
  children: ReactNode;
};

export function CartProvider({ children }: CartProviderProps) {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  useEffect(() => {
    const stored = localStorage.getItem(CART_STORAGE_KEY);

    if (stored) {
      dispatch({ type: "HYDRATE", payload: JSON.parse(stored) as CartState });
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const value = useMemo<CartContextValue>(() => {
    const total = state.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    return {
      items: state.items,
      total,
      addItem: (product: Product) => {
        dispatch({ type: "ADD_ITEM", payload: product });
      },
      removeItem: (productId: string) => {
        dispatch({ type: "REMOVE_ITEM", payload: { productId } });
      },
      clearCart: () => {
        dispatch({ type: "CLEAR" });
      },
    };
  }, [state]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }

  return context;
}
