"use client";

import type { ReactNode } from "react";
import type { Order } from "@/lib/types";

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
    <div className="flex min-h-[200px] flex-1 flex-col rounded-lg bg-zinc-100 p-3 dark:bg-zinc-800">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold">{title}</h3>
        <span className="rounded-full bg-white px-2 py-0.5 text-xs dark:bg-zinc-900">
          {orders.length}
        </span>
      </div>
      <div className="flex flex-col gap-3">
        {orders.map((o) => (
          <div key={o._id}>{renderCard ? renderCard(o) : null}</div>
        ))}
      </div>
    </div>
  );
}
