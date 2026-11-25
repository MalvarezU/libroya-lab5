"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type { Book } from "./types";

export interface CartItem {
  book: Book;
  quantity: number;
}

interface CartContextValue {
  items: CartItem[];
  add: (book: Book, quantity?: number) => void;
  remove: (bookId: string) => void;
  updateQty: (bookId: string, quantity: number) => void;
  clear: () => void;
  total: number;
  count: number;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);
const KEY = "libroYa_cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      try {
        setItems(JSON.parse(raw));
      } catch {
        // ignore
      }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const add = (book: Book, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.book._id === book._id);
      if (existing) {
        return prev.map((i) =>
          i.book._id === book._id ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      return [...prev, { book, quantity }];
    });
  };

  const remove = (bookId: string) => {
    setItems((prev) => prev.filter((i) => i.book._id !== bookId));
  };

  const updateQty = (bookId: string, quantity: number) => {
    if (quantity <= 0) {
      remove(bookId);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.book._id === bookId ? { ...i, quantity } : i))
    );
  };

  const clear = () => setItems([]);

  const total = items.reduce((s, i) => s + i.book.price * i.quantity, 0);
  const count = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, add, remove, updateQty, clear, total, count }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
