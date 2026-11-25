"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Book } from "@/lib/types";

export default function AdminBooksPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [books, setBooks] = useState<Book[]>([]);
  const [form, setForm] = useState({
    title: "",
    author: "",
    category: "",
    price: "",
    stock: "",
    coverUrl: "",
    isbn: "",
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== "operador") router.replace("/");
  }, [loading, user, router]);

  const load = async () => {
    try {
      const data = await api.getBooks();
      setBooks(data);
    } catch (e: any) {
      setErr(e?.message || "Error");
    }
  };

  useEffect(() => {
    if (user?.role === "operador") load();
  }, [user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    try {
      await api.createBook({
        title: form.title,
        author: form.author,
        category: form.category || undefined,
        price: Number(form.price),
        stock: Number(form.stock || 0),
        coverUrl: form.coverUrl || undefined,
        isbn: form.isbn || undefined,
        available: true,
      });
      setMsg("Libro creado");
      setForm({ title: "", author: "", category: "", price: "", stock: "", coverUrl: "", isbn: "" });
      load();
    } catch (e: any) {
      setErr(e?.message || "Error");
    }
  };

  const remove = async (id: string) => {
    try {
      await api.deleteBook(id);
      load();
    } catch (e: any) {
      setErr(e?.message || "Error");
    }
  };

  if (loading) return <p className="text-zinc-500">Cargando...</p>;
  if (!user || user.role !== "operador") return null;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Administrar libros</h1>
      {err && <p className="text-red-600 text-sm">{err}</p>}
      {msg && <p className="text-green-600 text-sm">{msg}</p>}

      <form onSubmit={submit} className="grid grid-cols-1 gap-3 rounded-lg border border-zinc-200 bg-white p-4 md:grid-cols-2 dark:border-zinc-800 dark:bg-zinc-900">
        <input placeholder="Título" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
        <input placeholder="Autor" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} required className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
        <input placeholder="Categoría" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
        <input placeholder="Precio" type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
        <input placeholder="Stock" type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
        <input placeholder="ISBN" value={form.isbn} onChange={(e) => setForm({ ...form, isbn: e.target.value })} className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
        <input placeholder="Cover URL" value={form.coverUrl} onChange={(e) => setForm({ ...form, coverUrl: e.target.value })} className="md:col-span-2 rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
        <button type="submit" className="md:col-span-2 rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700">
          Crear libro
        </button>
      </form>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
        {books.map((b) => (
          <div key={b._id} className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="font-medium">{b.title}</p>
            <p className="text-sm text-zinc-500">{b.author} — ${b.price.toFixed(2)}</p>
            <button onClick={() => remove(b._id)} className="mt-2 text-sm text-red-600 hover:underline">
              Eliminar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
