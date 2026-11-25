"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BookOpen, ShoppingCart, User, LogOut, Menu, X, LayoutDashboard, Package, BookPlus } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";

export default function Navbar() {
  const { user, logout, loading } = useAuth();
  const { count } = useCart();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const navLink = (href: string, label: string, Icon?: React.ComponentType<{ className?: string }>) => {
    const active = pathname === href || (href !== "/" && pathname.startsWith(href));
    return (
      <Link
        href={href}
        onClick={() => setOpen(false)}
        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          active
            ? "bg-accent-soft text-accent"
            : "text-ink-700 hover:bg-accent-soft/60 hover:text-accent"
        }`}
      >
        {Icon && <Icon className="h-4 w-4" />}
        {label}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-canvas/75 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-violet text-white shadow-soft transition-transform group-hover:scale-105">
            <BookOpen className="h-5 w-5" />
          </span>
          <span className="text-lg font-display font-bold tracking-tight text-ink-950">
            Libro<span className="gradient-text">Ya</span>
          </span>
        </Link>

        {/* Desktop */}
        <div className="hidden items-center gap-1 md:flex">
          {navLink("/", "Catálogo", BookOpen)}
          {navLink("/cart", "Carrito", ShoppingCart)}
          {user && navLink("/orders", "Mis pedidos", Package)}
          {user?.role === "operador" && (
            <>
              {navLink("/kitchen", "Panel operador", LayoutDashboard)}
              {navLink("/admin/books", "Libros", BookPlus)}
            </>
          )}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          {count > 0 && (
            <Link href="/cart" className="relative flex items-center" aria-label="Carrito">
              <ShoppingCart className="h-5 w-5 text-ink-700" />
              <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-violet px-1 text-[10px] font-bold text-white shadow-soft animate-[fadeUp_300ms_ease-out]">
                {count}
              </span>
            </Link>
          )}
          {!loading && (
            user ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-soft text-accent">
                    <User className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-sm font-medium text-ink-950">{user.name}</span>
                  <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
                    {user.role}
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="btn-press flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-ink-700 hover:bg-danger/10 hover:text-danger"
                >
                  <LogOut className="h-4 w-4" />
                  Salir
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login" className="btn-press rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink-700 hover:bg-accent-soft">
                  Entrar
                </Link>
                <Link href="/register" className="btn-press rounded-lg bg-gradient-to-r from-accent to-accent-violet px-4 py-2 text-sm font-semibold text-white shadow-soft hover:shadow-lift">
                  Registro
                </Link>
              </div>
            )
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden btn-press rounded-lg border border-border p-2 text-ink-700"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-border bg-canvas/95 backdrop-blur-xl md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3 sm:px-6">
            {navLink("/", "Catálogo", BookOpen)}
            {navLink("/cart", `Carrito${count > 0 ? ` (${count})` : ""}`, ShoppingCart)}
            {user && navLink("/orders", "Mis pedidos", Package)}
            {user?.role === "operador" && (
              <>
                {navLink("/kitchen", "Panel operador", LayoutDashboard)}
                {navLink("/admin/books", "Libros", BookPlus)}
              </>
            )}
            <div className="mt-2 border-t border-border pt-2">
              {!loading && (
                user ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 px-3 py-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-accent">
                        <User className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-sm font-medium text-ink-950">{user.name}</p>
                        <p className="text-xs text-ink-500">{user.role}</p>
                      </div>
                    </div>
                    <button onClick={logout} className="btn-press flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-danger hover:bg-danger/10">
                      <LogOut className="h-4 w-4" /> Salir
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Link href="/login" onClick={() => setOpen(false)} className="btn-press flex-1 rounded-lg border border-border px-4 py-2 text-center text-sm font-medium">
                      Entrar
                    </Link>
                    <Link href="/register" onClick={() => setOpen(false)} className="btn-press flex-1 rounded-lg bg-gradient-to-r from-accent to-accent-violet px-4 py-2 text-center text-sm font-semibold text-white">
                      Registro
                    </Link>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}