"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Truck, X } from "lucide-react";
import type { Order, ShipmentTracking } from "@/lib/types";

interface ShipmentFormModalProps {
  order: Order;
  onCancel: () => void;
  onConfirm: (shipment: ShipmentTracking) => Promise<void>;
}

export default function ShipmentFormModal({
  order,
  onCancel,
  onConfirm,
}: ShipmentFormModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const carrierRef = useRef<HTMLInputElement>(null);
  const [carrier, setCarrier] = useState("");
  const [trackingCode, setTrackingCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    carrierRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting) onCancel();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onCancel, submitting]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedCarrier = carrier.trim();
    const trimmedTrackingCode = trackingCode.trim();

    if (!trimmedCarrier || !trimmedTrackingCode) {
      setError("Ingrese el transportista y el código de seguimiento.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onConfirm({ carrier: trimmedCarrier, trackingCode: trimmedTrackingCode });
    } catch (e: unknown) {
      setError((e as { message?: string })?.message || "No se pudo registrar el envío.");
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-lift"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
              <Truck className="h-4 w-4" />
            </span>
            <div>
              <h2 id={titleId} className="font-display text-lg font-bold text-ink-950">
                Registrar envío
              </h2>
              <p id={descriptionId} className="mt-1 text-sm text-ink-500">
                Pedido #{order._id.slice(-6)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            aria-label="Cerrar"
            className="rounded-lg p-1 text-ink-500 hover:bg-accent-soft hover:text-ink-950 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="mt-5 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-700">
            Transportista
            <input
              ref={carrierRef}
              name="carrier"
              value={carrier}
              onChange={(event) => setCarrier(event.target.value)}
              required
              disabled={submitting}
              autoComplete="organization"
              placeholder="Ej.: Correos"
              className="rounded-lg border border-border bg-canvas px-3 py-2 text-ink-950 placeholder:text-ink-300 disabled:opacity-60"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-700">
            Código de seguimiento
            <input
              name="trackingCode"
              value={trackingCode}
              onChange={(event) => setTrackingCode(event.target.value)}
              required
              disabled={submitting}
              autoComplete="off"
              placeholder="Ej.: TRK-123456"
              className="rounded-lg border border-border bg-canvas px-3 py-2 font-mono text-ink-950 placeholder:font-sans placeholder:text-ink-300 disabled:opacity-60"
            />
          </label>
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <div className="mt-1 flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              className="btn-press rounded-lg border border-border px-4 py-2 text-sm font-semibold text-ink-700 hover:bg-accent-soft disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-press rounded-lg bg-gradient-to-r from-accent to-accent-violet px-4 py-2 text-sm font-semibold text-white shadow-soft disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Registrando..." : "Confirmar envío"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
