"use client";

import Link from "next/link";
import { Package, ChevronRight } from "lucide-react";
import type { Order } from "@/lib/types";

const STATUS_LABEL: Record<Order["status"], string> = {
  PENDING_PAYMENT: "Pendiente pago",
  PAID: "Pagado",
  PREPARING: "Preparando",
  SHIPPED: "Enviado",
  DELIVERED: "Entregado",
};

const STATUS_COLOR: Record<Order["status"], string> = {
  PENDING_PAYMENT: "bg-warning/15 text-warning",
  PAID: "bg-accent-soft text-accent",
  PREPARING: "bg-accent-violet/15 text-accent-violet",
  SHIPPED: "bg-warning/15 text-warning",
  DELIVERED: "bg-success/15 text-success",
};

function StatusBadgeLocal({ status }: { status: Order["status"] }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLOR[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

export default function OrderCard({ order, onAdvance }: { order: Order; onAdvance?: (order: Order) => void }) {
  const NEXT: Record<Order["status"], Order["status"] | null> = {
    PENDING_PAYMENT: "PAID",
    PAID: "PREPARING",
    PREPARING: "SHIPPED",
    SHIPPED: "DELIVERED",
    DELIVERED: null,
  };
  const next = NEXT[order.status];
  return (
    <div className="card-lift flex flex-col rounded-2xl border border-border bg-surface p-4 shadow-soft">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-accent">
            <Package className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs text-ink-500">Pedido</p>
            <p className="font-mono text-sm font-semibold text-ink-950">#{order._id.slice(-6)}</p>
          </div>
        </div>
        <StatusBadgeLocal status={order.status} />
      </div>
      <p className="mt-3 text-sm text-ink-700 line-clamp-2">
        {order.items.map((i) => `${i.title} ×${i.quantity}`).join(", ")}
      </p>
      <div className="mt-2 flex items-center justify-between text-sm">
        <span className="font-display text-lg font-bold text-accent">${order.total.toFixed(2)}</span>
        <span className="text-xs text-ink-500 truncate max-w-[140px]">{order.address}</span>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
        <Link href={`/orders/${order._id}`} className="flex items-center gap-1 text-xs font-medium text-accent hover:underline">
          Ver detalle <ChevronRight className="h-3.5 w-3.5" />
        </Link>
        {onAdvance && next && (
          <button
            onClick={() => onAdvance(order)}
            className="btn-press rounded-lg bg-gradient-to-r from-accent to-accent-violet px-3 py-1.5 text-xs font-semibold text-white shadow-soft"
          >
            Avanzar → {STATUS_LABEL[next]}
          </button>
        )}
      </div>
    </div>
  );
}