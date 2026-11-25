"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, ShoppingCart, Minus, Plus, BookOpen, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";
import { useCart } from "@/lib/cart";
import type { Book } from "@/lib/types";

export default function BookDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const { add } = useCart();
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api
      .getBook(id)
      .then((b) => {
        setBook(b);
        setLoading(false);
      })
      .catch((e) => {
        setError((e as { message?: string })?.message || "Error");
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <div className="skeleton aspect-[3/4] w-full max-w-md rounded-2xl" />
        <div className="flex flex-col gap-3">
          <div className="skeleton h-8 w-3/4" />
          <div className="skeleton h-4 w-1/2" />
          <div className="skeleton h-6 w-24" />
          <div className="skeleton h-20 w-full" />
        </div>
      </div>
    );
  }
  if (error) return <p className="text-danger">{error}</p>;
  if (!book) return <p>No encontrado</p>;

  const unavailable = !book.available || book.stock <= 0;
  const maxQty = Math.max(1, book.stock);

  const handleAdd = () => {
    if (unavailable) return;
    add(book, qty);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1400);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-sm text-ink-500">
        <Link href="/" className="hover:text-accent">Catálogo</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        {book.category && (
          <>
            <span className="hover:text-accent">{book.category}</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </>
        )}
        <span className="text-ink-950 font-medium line-clamp-1">{book.title}</span>
      </nav>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <div className="relative">
          <div className="aspect-[3/4] w-full max-w-md overflow-hidden rounded-2xl bg-accent-soft/40 shadow-lift">
            {book.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={book.coverUrl} alt={book.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-accent/60">
                <BookOpen className="h-16 w-16" />
                <span className="text-sm font-medium">Sin portada</span>
              </div>
            )}
          </div>
          {unavailable && (
            <span className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-danger/90 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
              No disponible
            </span>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <h1 className="font-display text-3xl font-extrabold leading-tight text-ink-950 sm:text-4xl">
              {book.title}
            </h1>
            <p className="mt-1 text-lg text-ink-500">{book.author}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {book.category && (
              <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
                {book.category}
              </span>
            )}
            {book.isbn && (
              <span className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-ink-500">
                ISBN {book.isbn}
              </span>
            )}
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${book.available && book.stock > 0 ? "bg-success/15 text-success" : "bg-danger/15 text-danger"}`}>
              {book.available && book.stock > 0 ? `En stock (${book.stock})` : "Sin stock"}
            </span>
            {book.stock > 0 && book.stock <= 5 && (
              <span className="rounded-full bg-warning/15 px-3 py-1 text-xs font-semibold text-warning">
                Últimas unidades
              </span>
            )}
          </div>

          <div className="flex items-baseline gap-2">
            <span className="font-display text-4xl font-extrabold text-accent">${book.price.toFixed(2)}</span>
            <span className="text-sm text-ink-500">USD</span>
          </div>

          {/* Quantity selector */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-ink-700">Cantidad</span>
            <div className="flex items-center rounded-xl border border-border bg-surface">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                disabled={qty <= 1}
                className="btn-press flex h-10 w-10 items-center justify-center text-ink-700 hover:bg-accent-soft disabled:opacity-40"
                aria-label="Disminuir cantidad"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-10 text-center text-sm font-semibold text-ink-950">{qty}</span>
              <button
                type="button"
                onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                disabled={qty >= maxQty}
                className="btn-press flex h-10 w-10 items-center justify-center text-ink-700 hover:bg-accent-soft disabled:opacity-40"
                aria-label="Aumentar cantidad"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={handleAdd}
              disabled={unavailable}
              className={`btn-press flex flex-1 items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-semibold shadow-soft transition-colors sm:flex-none ${
                added
                  ? "bg-success text-white"
                  : unavailable
                  ? "cursor-not-allowed bg-border text-ink-500"
                  : "bg-gradient-to-r from-accent to-accent-violet text-white hover:shadow-lift"
              }`}
            >
              {added ? <CheckCircle2 className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
              {added ? "Agregado al carrito" : "Agregar al carrito"}
            </button>
            <button
              onClick={() => router.push("/")}
              className="btn-press rounded-xl border border-border bg-surface px-5 py-3.5 text-sm font-semibold text-ink-700 hover:bg-accent-soft"
            >
              Volver
            </button>
          </div>

          <p className="text-xs text-ink-500">
            Compra segura con PayPal. Descarga inmediata tras el pago.
          </p>
        </div>
      </div>
    </div>
  );
}