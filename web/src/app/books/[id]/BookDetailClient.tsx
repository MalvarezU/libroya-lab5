"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useCart } from "@/lib/cart";
import type { Book } from "@/lib/types";

export default function BookDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const { add } = useCart();
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        setError(e?.message || "Error");
        setLoading(false);
      });
  }, [id]);

  if (loading) return <p className="text-zinc-500">Cargando...</p>;
  if (error) return <p className="text-red-600">{error}</p>;
  if (!book) return <p>No encontrado</p>;

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <div className="aspect-[3/4] w-full max-w-sm overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
        {book.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={book.coverUrl} alt={book.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-6xl">📖</div>
        )}
      </div>
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-bold">{book.title}</h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400">{book.author}</p>
        {book.category && <span className="w-fit rounded-full bg-zinc-100 px-3 py-1 text-sm dark:bg-zinc-800">{book.category}</span>}
        {book.isbn && <p className="text-sm text-zinc-500">ISBN: {book.isbn}</p>}
        <p className="text-2xl font-bold text-indigo-600">${book.price.toFixed(2)}</p>
        <p className="text-sm">Stock: {book.stock}</p>
        <p className={`text-sm ${book.available ? "text-green-600" : "text-red-600"}`}>
          {book.available ? "Disponible" : "No disponible"}
        </p>
        <div className="mt-4 flex gap-3">
          <button
            onClick={() => add(book)}
            disabled={!book.available || book.stock <= 0}
            className="rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            Agregar al carrito
          </button>
          <button onClick={() => router.push("/")} className="rounded-md border border-zinc-300 px-4 py-2 hover:bg-zinc-100 dark:border-zinc-700">
            Volver
          </button>
        </div>
      </div>
    </div>
  );
}