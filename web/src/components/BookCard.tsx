"use client";

import { useState } from "react";
import Link from "next/link";
import { ShoppingCart, AlertTriangle, Ban, BookOpen } from "lucide-react";
import { useCart } from "@/lib/cart";
import type { Book } from "@/lib/types";

export default function BookCard({ book }: { book: Book }) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);

  const unavailable = !book.available || book.stock <= 0;
  const lowStock = book.available && book.stock > 0 && book.stock <= 5;

  const handleAdd = () => {
    if (unavailable) return;
    add(book);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1200);
  };

  return (
    <article className="group card-lift flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
      <Link href={`/books/${book._id}`} className="relative block aspect-[3/4] w-full overflow-hidden bg-accent-soft/40">
        {book.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={book.coverUrl} alt={book.title} className="img-zoom h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-accent/60">
            <BookOpen className="h-12 w-12" />
            <span className="text-xs font-medium">Sin portada</span>
          </div>
        )}
        {unavailable && (
          <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-danger/90 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
            <Ban className="h-3 w-3" /> No disponible
          </span>
        )}
        {lowStock && (
          <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-warning/90 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
            <AlertTriangle className="h-3 w-3" /> Últimas {book.stock}
          </span>
        )}
        {book.category && (
          <span className="absolute bottom-3 left-3 rounded-full bg-surface/90 px-2.5 py-1 text-[11px] font-medium text-ink-700 backdrop-blur">
            {book.category}
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <Link href={`/books/${book._id}`}>
          <h3 className="line-clamp-2 font-display text-base font-semibold text-ink-950 transition-colors group-hover:text-accent">
            {book.title}
          </h3>
        </Link>
        <p className="text-sm text-ink-500">{book.author}</p>
        <div className="mt-auto flex items-end justify-between pt-3">
          <span className="text-xl font-display font-bold text-accent">${book.price.toFixed(2)}</span>
          <span className="text-xs text-ink-500">Stock {book.stock}</span>
        </div>
        <button
          onClick={handleAdd}
          disabled={unavailable}
          aria-label={`Agregar ${book.title} al carrito`}
          className={`btn-press mt-2 flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
            added
              ? "bg-success text-white"
              : unavailable
              ? "cursor-not-allowed bg-border text-ink-500"
              : "bg-gradient-to-r from-accent to-accent-violet text-white shadow-soft hover:shadow-lift"
          }`}
        >
          <ShoppingCart className="h-4 w-4" />
          {added ? "Agregado" : unavailable ? "No disponible" : "Agregar al carrito"}
        </button>
      </div>
    </article>
  );
}