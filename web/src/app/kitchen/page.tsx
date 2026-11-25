"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { getSocket } from "@/lib/socket";
import OrderCard from "@/components/OrderCard";
import KanbanColumn from "@/components/KanbanColumn";
import type { Order } from "@/lib/types";

const COLUMNS: { status: Order["status"]; title: string }[] = [
  { status: "PAID", title: "Pagado" },
  { status: "PREPARING", title: "Preparando" },
  { status: "SHIPPED", title: "Enviado" },
  { status: "DELIVERED", title: "Entregado" },
];

const NEXT: Record<Order["status"], Order["status"] | null> = {
  PENDING_PAYMENT: "PAID",
  PAID: "PREPARING",
  PREPARING: "SHIPPED",
  SHIPPED: "DELIVERED",
  DELIVERED: null,
};

export default function KitchenPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== "operador") {
      router.replace("/");
    }
  }, [loading, user, router]);

  const upsert = (o: Order) => {
    setOrders((prev) => {
      const idx = prev.findIndex((x) => x._id === o._id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = o;
        return copy;
      }
      return [o, ...prev];
    });
  };

  const load = async () => {
    try {
      const data = await api.getAllOrders();
      setOrders(data);
      setError(null);
    } catch (e: any) {
      // fallback: keep socket-accumulated
      setError(e?.message || "Error cargando pedidos");
    }
  };

  useEffect(() => {
    if (loading || !user || user.role !== "operador") return;
    load();
  }, [loading, user]);

  useEffect(() => {
    if (!token || !user || user.role !== "operador") return;
    const socket = getSocket(token);
    const onCreated = (payload: any) => {
      // summary; fetch full order
      if (payload?._id) {
        api.getOrder(payload._id).then(upsert).catch(() => {});
      }
    };
    const onStatus = (payload: any) => {
      if (payload?._id) {
        api.getOrder(payload._id).then(upsert).catch(() => {});
      }
    };
    const onUpdated = (payload: any) => {
      if (payload?._id) upsert(payload as Order);
    };
    const onConnect = () => load();
    socket.on("order:created", onCreated);
    socket.on("order:status_changed", onStatus);
    socket.on("order:updated", onUpdated);
    socket.on("connect", onConnect);
    return () => {
      socket.off("order:created", onCreated);
      socket.off("order:status_changed", onStatus);
      socket.off("order:updated", onUpdated);
      socket.off("connect", onConnect);
    };
  }, [token, user]);

  const advance = async (order: Order) => {
    const next = NEXT[order.status];
    if (!next) return;
    try {
      const updated = await api.updateOrderStatus(order._id, next);
      upsert(updated);
    } catch (e: any) {
      setError(e?.message || "Transición inválida");
    }
  };

  if (loading) return <p className="text-zinc-500">Cargando...</p>;
  if (!user || user.role !== "operador") return null;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Panel operador — Kanban</h1>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <div className="flex flex-col gap-4 md:flex-row">
        {COLUMNS.map((col) => {
          const colOrders = orders.filter((o) => o.status === col.status);
          return (
            <KanbanColumn
              key={col.status}
              title={col.title}
              status={col.status}
              orders={colOrders}
              renderCard={(o) => <OrderCard order={o} onAdvance={advance} />}
            />
          );
        })}
      </div>
    </div>
  );
}
