"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Package, ShoppingBag } from "lucide-react";
import { api } from "@/lib/api";
import OrderCard from "@/components/OrderCard";
import type { Order } from "@/lib/types";

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.getMyOrders();
      setOrders(data);
      setError(null);
    } catch (e: unknown) {
      setError((e as { message?: string })?.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-ink-950">Mis pedidos</h1>
        <Link href="/" className="btn-press inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium text-ink-700 hover:bg-accent-soft">
          <ShoppingBag className="h-4 w-4" /> Seguir comprando
        </Link>
      </div>
      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border bg-surface p-4 shadow-soft">
              <div className="skeleton h-4 w-1/3" />
              <div className="skeleton mt-3 h-4 w-2/3" />
              <div className="skeleton mt-2 h-4 w-1/2" />
            </div>
          ))}
        </div>
      )}
      {error && <p className="text-danger">{error}</p>}
      {!loading && orders.length === 0 && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border bg-surface py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft text-accent">
            <Package className="h-8 w-8" />
          </div>
          <div>
            <p className="font-display text-lg font-semibold text-ink-950">Aún no tienes pedidos</p>
            <p className="mt-1 text-sm text-ink-500">Explora el catálogo y haz tu primera compra.</p>
          </div>
          <Link href="/" className="btn-press rounded-xl bg-gradient-to-r from-accent to-accent-violet px-5 py-2.5 text-sm font-semibold text-white shadow-soft">
            Ir al catálogo
          </Link>
        </div>
      )}
      {!loading && orders.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {orders.map((o) => (
            <OrderCard key={o._id} order={o} />
          ))}
        </div>
      )}
    </div>
  );
}