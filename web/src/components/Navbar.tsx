"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";

export default function Navbar() {
  const { user, logout, loading } = useAuth();
  const { count } = useCart();

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-black/80">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-xl font-bold text-indigo-600">
          LibroYa
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/" className="hover:text-indigo-600">Catálogo</Link>
          <Link href="/cart" className="relative hover:text-indigo-600">
            Carrito
            {count > 0 && (
              <span className="ml-1 rounded-full bg-indigo-600 px-2 py-0.5 text-xs text-white">
                {count}
              </span>
            )}
          </Link>
          {user && <Link href="/orders" className="hover:text-indigo-600">Mis pedidos</Link>}
          {user?.role === "operador" && (
            <>
              <Link href="/kitchen" className="hover:text-indigo-600">Panel operador</Link>
              <Link href="/admin/books" className="hover:text-indigo-600">Libros</Link>
            </>
          )}
          {!loading && (
            user ? (
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline text-zinc-600 dark:text-zinc-300">{user.name}</span>
                <button
                  onClick={logout}
                  className="rounded-md border border-zinc-300 px-3 py-1.5 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                >
                  Salir
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login" className="rounded-md border border-zinc-300 px-3 py-1.5 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">
                  Entrar
                </Link>
                <Link href="/register" className="rounded-md bg-indigo-600 px-3 py-1.5 text-white hover:bg-indigo-700">
                  Registro
                </Link>
              </div>
            )
          )}
        </div>
      </nav>
    </header>
  );
}
