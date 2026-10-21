"use client";
import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";
import type { CartItem } from "@/lib/types";

type CartContextValue = {
  items: CartItem[];
  add: (item: CartItem) => void;
  remove: (variantId: string) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  clear: () => void;
  count: number;
  total: number;
};
const CartContext = createContext<CartContextValue | null>(null);
const KEY = "enjoy-life-cart-v1";
const CART_CHANGED = "enjoy-life-cart-changed";
const EMPTY_CART: CartItem[] = [];
let cachedCart = EMPTY_CART;
let cachedSerialized: string | null = null;

function readCart(): CartItem[] {
  try {
    const serialized = localStorage.getItem(KEY) || "[]";
    if (serialized === cachedSerialized) return cachedCart;
    const saved: unknown = JSON.parse(serialized);
    if (Array.isArray(saved)) {
      cachedSerialized = serialized;
      cachedCart = saved.filter((x) => x && typeof x.variantId === "string" && Number.isInteger(x.quantity) && x.quantity > 0).slice(0, 20);
      return cachedCart;
    }
    cachedSerialized = serialized;
    cachedCart = EMPTY_CART;
    return cachedCart;
  } catch {
    localStorage.removeItem(KEY);
  }
  cachedSerialized = "[]";
  cachedCart = EMPTY_CART;
  return cachedCart;
}

function subscribeCart(onStoreChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY) onStoreChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CART_CHANGED, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CART_CHANGED, onStoreChange);
  };
}

function saveCart(items: CartItem[]) {
  const serialized = JSON.stringify(items);
  cachedSerialized = serialized;
  cachedCart = items;
  localStorage.setItem(KEY, serialized);
  window.dispatchEvent(new Event(CART_CHANGED));
}

export function CartProvider({ children }: { children: ReactNode }) {
  const items = useSyncExternalStore(subscribeCart, readCart, () => EMPTY_CART);
  const add = (item: CartItem) => {
    const old = readCart();
    const existing = old.find((x) => x.variantId === item.variantId);
    saveCart(existing
      ? old.map((x) => x.variantId === item.variantId ? { ...x, quantity: Math.min(x.quantity + item.quantity, 10) } : x)
      : old.length >= 20 ? old : [...old, { ...item, quantity: Math.max(1, Math.min(10, item.quantity)) }]);
  };
  const remove = (id: string) => saveCart(readCart().filter((x) => x.variantId !== id));
  const setQuantity = (id: string, q: number) => saveCart(readCart().map((x) => x.variantId === id ? { ...x, quantity: Math.max(1, Math.min(10, q)) } : x));
  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return <CartContext.Provider value={{ items, add, remove, setQuantity, clear: () => saveCart([]), count, total }}>{children}</CartContext.Provider>;
}
export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be inside CartProvider");
  return ctx;
}
