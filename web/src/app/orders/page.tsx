"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
    } catch (e: any) {
      setError(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Mis pedidos</h1>
      {loading && <p className="text-zinc-500">Cargando...</p>}
      {error && <p className="text-red-600">{error}</p>}
      {!loading && orders.length === 0 && <p className="text-zinc-500">No tienes pedidos.</p>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {orders.map((o) => (
          <OrderCard key={o._id} order={o} />
        ))}
      </div>
      <Link href="/" className="text-indigo-600 hover:underline">Seguir comprando</Link>
    </div>
  );
}
