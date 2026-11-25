"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import BookCard from "@/components/BookCard";
import type { Book } from "@/lib/types";

export default function HomePage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [category, setCategory] = useState<string>("");
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .getBooks(category || undefined)
      .then((data) => {
        if (cancelled) return;
        setBooks(data);
        if (!category) {
          const cats = Array.from(new Set(data.map((b) => b.category).filter(Boolean))) as string[];
          setCategories(cats);
        }
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.message || "Error cargando libros");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [category]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Catálogo</h1>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {loading && <p className="text-zinc-500">Cargando...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && books.length === 0 && (
        <p className="text-zinc-500">No hay libros disponibles.</p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {books.map((b) => (
          <BookCard key={b._id} book={b} />
        ))}
      </div>
    </div>
  );
}
