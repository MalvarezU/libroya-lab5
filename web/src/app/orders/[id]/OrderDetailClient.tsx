"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { getSocket } from "@/lib/socket";
import OrderCard from "@/components/OrderCard";
import type { Order } from "@/lib/types";

export default function OrderDetailClient({ id }: { id: string }) {
  const { token } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const load = async () => {
      try {
        const data = await api.getOrder(id);
        if (!cancelled) {
          setOrder(data);
          setError(null);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();

    if (!token) return () => { cancelled = true; };
    const socket = getSocket(token);
    const refetch = () => load();
    const onStatus = (payload: any) => {
      if (payload?._id === id || payload?.id === id) refetch();
    };
    const onUpdated = (payload: any) => {
      if (payload?._id === id || payload?.id === id) {
        setOrder(payload as Order);
      }
    };
    socket.on("order:status_changed", onStatus);
    socket.on("order:updated", onUpdated);
    socket.on("connect", refetch);
    return () => {
      cancelled = true;
      socket.off("order:status_changed", onStatus);
      socket.off("order:updated", onUpdated);
      socket.off("connect", refetch);
    };
  }, [id, token]);

  if (loading) return <p className="text-zinc-500">Cargando...</p>;
  if (error) return <p className="text-red-600">{error}</p>;
  if (!order) return <p>No encontrado</p>;

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <h1 className="text-2xl font-bold">Pedido #{order._id.slice(-6)}</h1>
      <OrderCard order={order} />
      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="font-semibold mb-2">Items</h2>
        <ul className="flex flex-col gap-2">
          {order.items.map((i, idx) => (
            <li key={idx} className="flex justify-between text-sm">
              <span>{i.title} x{i.quantity}</span>
              <span>${(i.price * i.quantity).toFixed(2)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 border-t pt-3 flex justify-between font-bold">
          <span>Total</span>
          <span>${order.total.toFixed(2)}</span>
        </div>
      </div>
      <div className="text-sm text-zinc-600 dark:text-zinc-400">
        <p>Dirección: {order.address}</p>
        <p>Pago: {order.paymentStatus}</p>
        {order.createdAt && <p>Creado: {new Date(order.createdAt).toLocaleString()}</p>}
      </div>
    </div>
  );
}