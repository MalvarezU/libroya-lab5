"use client";

import { useCart } from "@/lib/cart";
import type { Book } from "@/lib/types";

export default function BookCard({ book }: { book: Book }) {
  const { add } = useCart();
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
      <div className="aspect-[3/4] w-full bg-zinc-100 dark:bg-zinc-800">
        {book.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={book.coverUrl} alt={book.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl text-zinc-400">📖</div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <h3 className="line-clamp-2 font-semibold">{book.title}</h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{book.author}</p>
        {book.category && (
          <span className="mt-1 inline-block w-fit rounded-full bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800">
            {book.category}
          </span>
        )}
        <div className="mt-auto flex items-center justify-between pt-3">
          <span className="text-lg font-bold text-indigo-600">${book.price.toFixed(2)}</span>
          <span className="text-xs text-zinc-500">Stock: {book.stock}</span>
        </div>
        <button
          onClick={() => add(book)}
          disabled={!book.available || book.stock <= 0}
          className="mt-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Agregar al carrito
        </button>
      </div>
    </div>
  );
}
