"use client";

import { Check, Circle } from "lucide-react";
import type { OrderStatus } from "@/lib/types";

const STEPS: { status: OrderStatus; label: string }[] = [
  { status: "PENDING_PAYMENT", label: "Pendiente de pago" },
  { status: "PAID", label: "Pagado" },
  { status: "PREPARING", label: "Preparando" },
  { status: "SHIPPED", label: "Enviado" },
  { status: "DELIVERED", label: "Entregado" },
];

const ORDER: Record<OrderStatus, number> = {
  PENDING_PAYMENT: 0,
  PAID: 1,
  PREPARING: 2,
  SHIPPED: 3,
  DELIVERED: 4,
  CANCELLED: -1,
};

export default function StatusTimeline({ status }: { status: OrderStatus }) {
  const current = ORDER[status];
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-ink-500">Estado actual:</span>
        <span className="rounded-full bg-accent-soft px-2.5 py-1 font-semibold text-accent">
          {current < 0 ? "Cancelado" : STEPS[current]?.label ?? status}
        </span>
      </div>
      {status === "CANCELLED" ? (
        <p className="text-sm text-ink-500">Pedido cancelado. El stock reservado fue liberado.</p>
      ) : (
      <ol className="flex flex-col gap-0 sm:flex-row sm:items-start sm:gap-2">
      {STEPS.map((step, idx) => {
        const done = idx < current;
        const active = idx === current;
        return (
          <li key={step.status} aria-current={active ? "step" : undefined} className="flex items-center gap-3 sm:flex-1 sm:flex-col sm:items-center sm:text-center">
            <div className="flex items-center gap-3 sm:flex-col sm:gap-1">
              <span
                className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                  done
                    ? "border-success bg-success text-white"
                    : active
                    ? "border-accent bg-accent text-white pulse-dot"
                    : "border-border bg-surface text-ink-300"
                }`}
              >
                {done ? <Check className="h-4 w-4" /> : <Circle className="h-3 w-3" />}
              </span>
              <span
                className={`text-xs font-medium ${
                  done ? "text-success" : active ? "text-accent" : "text-ink-300"
                }`}
              >
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={`hidden h-0.5 flex-1 sm:block ${
                  idx < current ? "bg-success" : "bg-border"
                }`}
              />
            )}
          </li>
        );
      })}
      </ol>
      )}
    </div>
  );
}