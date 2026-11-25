"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus, BookOpen, AlertCircle, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import type { Book } from "@/lib/types";

export default function AdminBooksPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
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
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== "operador") router.replace("/");
  }, [loading, user, router]);

  const load = async () => {
    try {
      const data = await api.getBooks();
      setBooks(data);
    } catch (e: unknown) {
      setErr((e as { message?: string })?.message || "Error");
    }
  };

  useEffect(() => {
    if (user?.role === "operador") load();
  }, [user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setSubmitting(true);
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
      setMsg("Libro creado correctamente");
      toast("Libro creado correctamente", "success");
      setForm({ title: "", author: "", category: "", price: "", stock: "", coverUrl: "", isbn: "" });
      load();
    } catch (e: unknown) {
      setErr((e as { message?: string })?.message || "Error");
      toast((e as { message?: string })?.message || "Error", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await api.deleteBook(id);
      toast("Libro eliminado", "success");
      load();
    } catch (e: unknown) {
      setErr((e as { message?: string })?.message || "Error");
      toast((e as { message?: string })?.message || "Error", "error");
    }
  };

  if (loading) return <p className="text-ink-500">Cargando...</p>;
  if (!user || user.role !== "operador") return null;

  const inputClass =
    "w-full rounded-xl border border-border bg-canvas px-3 py-2.5 text-sm text-ink-950 placeholder:text-ink-300 focus:border-accent";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-950">Administrar libros</h1>
          <p className="text-sm text-ink-500">Crea y gestiona el catálogo.</p>
        </div>
        <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
          {books.length} libros
        </span>
      </div>

      {err && (
        <div className="flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          <AlertCircle className="h-4 w-4" /> {err}
        </div>
      )}
      {msg && (
        <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/15 p-3 text-sm text-success">
          <CheckCircle2 className="h-4 w-4" /> {msg}
        </div>
      )}

      <form onSubmit={submit} className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
        <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-ink-950">
          <Plus className="h-5 w-5 text-accent" /> Nuevo libro
        </h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <input placeholder="Título" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className={inputClass} />
          <input placeholder="Autor" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} required className={inputClass} />
          <input placeholder="Categoría" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputClass} />
          <input placeholder="Precio" type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required className={inputClass} />
          <input placeholder="Stock" type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className={inputClass} />
          <input placeholder="ISBN" value={form.isbn} onChange={(e) => setForm({ ...form, isbn: e.target.value })} className={inputClass} />
          <input placeholder="Cover URL" value={form.coverUrl} onChange={(e) => setForm({ ...form, coverUrl: e.target.value })} className="md:col-span-2 w-full rounded-xl border border-border bg-canvas px-3 py-2.5 text-sm text-ink-950 placeholder:text-ink-300 focus:border-accent" />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="btn-press mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent to-accent-violet px-5 py-2.5 text-sm font-semibold text-white shadow-soft hover:shadow-lift disabled:opacity-60"
        >
          {submitting && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
          {submitting ? "Creando..." : "Crear libro"}
        </button>
      </form>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
        <div className="grid grid-cols-12 gap-2 border-b border-border bg-canvas px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-500">
          <div className="col-span-5">Título</div>
          <div className="col-span-3">Autor</div>
          <div className="col-span-2">Precio</div>
          <div className="col-span-2 text-right">Acciones</div>
        </div>
        {books.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <BookOpen className="h-8 w-8 text-ink-300" />
            <p className="text-sm text-ink-500">No hay libros en el catálogo.</p>
          </div>
        )}
        {books.map((b) => (
          <div key={b._id} className="grid grid-cols-12 items-center gap-2 border-b border-border px-4 py-3 text-sm last:border-b-0">
            <div className="col-span-5 flex items-center gap-3 min-w-0">
              <div className="h-10 w-8 flex-shrink-0 overflow-hidden rounded bg-accent-soft/40">
                {b.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.coverUrl} alt={b.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-accent/60">
                    <BookOpen className="h-4 w-4" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium text-ink-950">{b.title}</p>
                <p className="truncate text-xs text-ink-500">{b.category || "Sin categoría"} · Stock {b.stock}</p>
              </div>
            </div>
            <div className="col-span-3 truncate text-ink-700">{b.author}</div>
            <div className="col-span-2 font-display font-bold text-accent">${b.price.toFixed(2)}</div>
            <div className="col-span-2 flex justify-end">
              <button
                onClick={() => remove(b._id)}
                className="btn-press flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger/10"
              >
                <Trash2 className="h-3.5 w-3.5" /> Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}