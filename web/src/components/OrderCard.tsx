"use client";

import Link from "next/link";
import type { Order } from "@/lib/types";

const STATUS_LABEL: Record<Order["status"], string> = {
  PENDING_PAYMENT: "Pendiente pago",
  PAID: "Pagado",
  PREPARING: "Preparando",
  SHIPPED: "Enviado",
  DELIVERED: "Entregado",
};

const STATUS_COLOR: Record<Order["status"], string> = {
  PENDING_PAYMENT: "bg-yellow-100 text-yellow-800",
  PAID: "bg-blue-100 text-blue-800",
  PREPARING: "bg-purple-100 text-purple-800",
  SHIPPED: "bg-orange-100 text-orange-800",
  DELIVERED: "bg-green-100 text-green-800",
};

export function StatusBadge({ status }: { status: Order["status"] }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[status]}`}>
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
    <div className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-500">#{order._id.slice(-6)}</span>
        <StatusBadge status={order.status} />
      </div>
      <p className="mt-2 text-sm font-medium line-clamp-2">
        {order.items.map((i) => `${i.title} x${i.quantity}`).join(", ")}
      </p>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">${order.total.toFixed(2)}</p>
      <p className="mt-1 text-xs text-zinc-500 truncate">{order.address}</p>
      <div className="mt-3 flex items-center justify-between">
        <Link href={`/orders/${order._id}`} className="text-xs text-indigo-600 hover:underline">
          Ver detalle
        </Link>
        {onAdvance && next && (
          <button
            onClick={() => onAdvance(order)}
            className="rounded-md bg-indigo-600 px-2 py-1 text-xs text-white hover:bg-indigo-700"
          >
            Avanzar → {STATUS_LABEL[next]}
          </button>
        )}
      </div>
    </div>
  );
}
