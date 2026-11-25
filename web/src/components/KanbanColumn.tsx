"use client";

import type { ReactNode } from "react";
import { GripVertical, Inbox } from "lucide-react";
import type { Order } from "@/lib/types";

const STATUS_COLOR: Record<Order["status"], string> = {
  PENDING_PAYMENT: "from-warning to-warning",
  PAID: "from-accent to-accent-violet",
  PREPARING: "from-accent-violet to-accent",
  SHIPPED: "from-warning to-danger",
  DELIVERED: "from-success to-success",
};

const STATUS_BG: Record<Order["status"], string> = {
  PENDING_PAYMENT: "bg-warning/10",
  PAID: "bg-accent-soft",
  PREPARING: "bg-accent-violet/10",
  SHIPPED: "bg-warning/10",
  DELIVERED: "bg-success/10",
};

export default function KanbanColumn({
  title,
  status,
  orders,
  renderCard,
}: {
  title: string;
  status: Order["status"];
  orders: Order[];
  renderCard?: (order: Order) => ReactNode;
}) {
  return (
    <div className="flex min-h-[300px] flex-1 flex-col rounded-2xl border border-border bg-canvas/60 p-3">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${STATUS_COLOR[status]} text-white shadow-soft`}>
            <GripVertical className="h-4 w-4" />
          </span>
          <h3 className="font-display font-semibold text-ink-950">{title}</h3>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_BG[status]} text-ink-950`}>
          {orders.length}
        </span>
      </div>
      <div className="flex flex-col gap-3">
        {orders.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-8 text-center">
            <Inbox className="h-6 w-6 text-ink-300" />
            <p className="text-xs text-ink-500">Sin pedidos</p>
          </div>
        )}
        {orders.map((o) => (
          <div key={o._id}>{renderCard ? renderCard(o) : null}</div>
        ))}
      </div>
    </div>
  );
}