"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, SearchX } from "lucide-react";
import { api } from "@/lib/api";
import BookCard from "@/components/BookCard";
import type { Book } from "@/lib/types";

function SkeletonCard() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
      <div className="skeleton aspect-[3/4] w-full" />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="skeleton h-4 w-3/4" />
        <div className="skeleton h-3 w-1/2" />
        <div className="mt-auto flex justify-between pt-3">
          <div className="skeleton h-5 w-16" />
          <div className="skeleton h-3 w-12" />
        </div>
        <div className="skeleton h-10 w-full" />
      </div>
    </div>
  );
}

export default function HomePage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [allBooks, setAllBooks] = useState<Book[]>([]);
  const [category, setCategory] = useState<string>("");
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .getBooks()
      .then((data) => {
        if (cancelled) return;
        setAllBooks(data);
        const cats = Array.from(new Set(data.map((b) => b.category).filter(Boolean))) as string[];
        setCategories(cats);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .getBooks(category || undefined)
      .then((data) => {
        if (cancelled) return;
        setBooks(data);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError((e as { message?: string })?.message || "Error cargando libros");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [category]);

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const b of allBooks) {
      if (b.category) m[b.category] = (m[b.category] || 0) + 1;
    }
    return m;
  }, [allBooks]);

  const totalCount = allBooks.length || books.length;

  return (
    <div className="flex flex-col gap-8">
      {/* Hero */}
      <section className="hero-mesh relative overflow-hidden rounded-3xl border border-border px-6 py-12 sm:px-10 sm:py-16">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/80 px-3 py-1 text-xs font-medium text-accent backdrop-blur">
            <BookOpen className="h-3.5 w-3.5" /> Biblioteca digital
          </span>
          <h1 className="mt-4 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-ink-950 sm:text-5xl lg:text-6xl">
            Descubre tu próxima <span className="gradient-text">gran lectura</span>
          </h1>
          <p className="mt-4 text-base text-ink-500 sm:text-lg">
            E-books cuidadosamente seleccionados. Compra, descarga y lee en segundos. Sin esperas, sin envíos.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="#catalogo" className="btn-press inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent to-accent-violet px-5 py-3 text-sm font-semibold text-white shadow-soft hover:shadow-lift">
              Explorar catálogo <ArrowRight className="h-4 w-4" />
            </a>
            <Link href="/register" className="btn-press inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-5 py-3 text-sm font-semibold text-ink-950 hover:bg-accent-soft">
              Crear cuenta
            </Link>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 right-20 h-48 w-48 rounded-full bg-accent-violet/20 blur-3xl" />
      </section>

      {/* Catalog */}
      <section id="catalogo" className="flex flex-col gap-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-display text-2xl font-bold text-ink-950">Catálogo</h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCategory("")}
              className={`btn-press rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                category === ""
                  ? "bg-gradient-to-r from-accent to-accent-violet text-white shadow-soft"
                  : "border border-border bg-surface text-ink-700 hover:bg-accent-soft"
              }`}
            >
              Todas
              <span className="ml-1.5 rounded-full bg-white/20 px-1.5 text-xs">{totalCount}</span>
            </button>
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`btn-press rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  category === c
                    ? "bg-gradient-to-r from-accent to-accent-violet text-white shadow-soft"
                    : "border border-border bg-surface text-ink-700 hover:bg-accent-soft"
                }`}
              >
                {c}
                <span className="ml-1.5 rounded-full bg-black/5 px-1.5 text-xs dark:bg-white/10">
                  {counts[c] ?? 0}
                </span>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
            {error}
          </div>
        )}

        {loading && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {!loading && !error && books.length === 0 && (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border bg-surface py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft text-accent">
              <SearchX className="h-8 w-8" />
            </div>
            <div>
              <p className="font-display text-lg font-semibold text-ink-950">No hay libros disponibles</p>
              <p className="mt-1 text-sm text-ink-500">
                {category ? "Prueba con otra categoría." : "Vuelve pronto, estamos agregando novedades."}
              </p>
            </div>
            {category && (
              <button onClick={() => setCategory("")} className="btn-press rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-accent-soft">
                Ver todas las categorías
              </button>
            )}
          </div>
        )}

        {!loading && books.length > 0 && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {books.map((b) => (
              <BookCard key={b._id} book={b} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}