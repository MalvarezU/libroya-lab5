"use client";

import { useCallback, useEffect, useState } from "react";
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
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== "operador") {
      router.replace("/");
    }
  }, [loading, user, router]);

  const flash = useCallback((id: string) => {
    setFlashIds((prev) => new Set(prev).add(id));
    window.setTimeout(() => {
      setFlashIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 1400);
  }, []);

  const upsert = useCallback((o: Order) => {
    setOrders((prev) => {
      const idx = prev.findIndex((x) => x._id === o._id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = o;
        return copy;
      }
      return [o, ...prev];
    });
    flash(o._id);
  }, [flash]);

  const load = async () => {
    try {
      const data = await api.getAllOrders();
      setOrders(data);
      setError(null);
    } catch (e: unknown) {
      // fallback: keep socket-accumulated
      setError((e as { message?: string })?.message || "Error cargando pedidos");
    }
  };

  useEffect(() => {
    if (loading || !user || user.role !== "operador") return;
    load();
  }, [loading, user]);

  useEffect(() => {
    if (!token || !user || user.role !== "operador") return;
    const socket = getSocket(token);
    const onCreated = (payload: Record<string, unknown>) => {
      if (payload?._id) {
        api.getOrder(String(payload._id)).then(upsert).catch(() => {});
      }
    };
    const onStatus = (payload: Record<string, unknown>) => {
      if (payload?._id) {
        api.getOrder(String(payload._id)).then(upsert).catch(() => {});
      }
    };
    const onUpdated = (payload: Record<string, unknown>) => {
      if (payload?._id) upsert(payload as unknown as Order);
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
  }, [token, user, upsert]);

  const advance = async (order: Order) => {
    const next = NEXT[order.status];
    if (!next) return;
    try {
      const updated = await api.updateOrderStatus(order._id, next);
      upsert(updated);
    } catch (e: unknown) {
      setError((e as { message?: string })?.message || "Transición inválida");
    }
  };

  if (loading) return <p className="text-ink-500">Cargando...</p>;
  if (!user || user.role !== "operador") return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-ink-950">Panel operador — Kanban</h1>
        <span className="text-sm text-ink-500">{orders.length} pedidos</span>
      </div>
      {error && <p className="text-danger text-sm">{error}</p>}
      <div className="flex flex-col gap-4 md:flex-row">
        {COLUMNS.map((col) => {
          const colOrders = orders.filter((o) => o.status === col.status);
          return (
            <KanbanColumn
              key={col.status}
              title={col.title}
              status={col.status}
              orders={colOrders}
              renderCard={(o) => (
                <div className={flashIds.has(o._id) ? "animate-[fadeUp_400ms_ease-out] rounded-2xl ring-2 ring-accent ring-offset-2 ring-offset-canvas" : ""}>
                  <OrderCard order={o} onAdvance={advance} />
                </div>
              )}
            />
          );
        })}
      </div>
    </div>
  );
}
