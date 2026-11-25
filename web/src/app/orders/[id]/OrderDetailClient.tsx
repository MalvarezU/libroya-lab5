"use client";

import { useEffect, useRef, useState } from "react";
import {
  Package,
  MapPin,
  CreditCard,
  Calendar,
  Truck,
  Hash,
  PackageCheck,
  Download,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { getSocket } from "@/lib/socket";
import OrderCard from "@/components/OrderCard";
import StatusTimeline from "@/components/StatusTimeline";
import type { Order, Shipment } from "@/lib/types";

const SHIPMENT_STATUS_LABEL: Record<Shipment["status"], string> = {
  PENDING: "Pendiente",
  PREPARING: "En preparación",
  SHIPPED: "Enviado",
  DELIVERED: "Entregado",
};

const DOWNLOADABLE_STATUSES: Order["status"][] = [
  "PAID",
  "PREPARING",
  "SHIPPED",
  "DELIVERED",
];

export default function OrderDetailClient({ id }: { id: string }) {
  const { token, user } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingBookId, setDownloadingBookId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<{ bookId: string; message: string } | null>(null);
  const loadVersion = useRef(0);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const load = async () => {
      const version = ++loadVersion.current;
      const [orderResult, shipmentResult] = await Promise.allSettled([
        api.getOrder(id),
        api.getShipmentByOrder(id),
      ]);
      if (cancelled || version !== loadVersion.current) return;

      if (orderResult.status === "rejected") {
        setError((orderResult.reason as { message?: string })?.message || "Error");
        setLoading(false);
        return;
      }

      setOrder(orderResult.value);
      setShipment(shipmentResult.status === "fulfilled" ? shipmentResult.value : null);
      setError(null);
      setLoading(false);
    };
    load();

    if (!token) return () => { cancelled = true; };
    const socket = getSocket(token);
    const refetch = () => load();
    const onStatus = (payload: Record<string, unknown>) => {
      if (payload?._id === id || payload?.id === id) refetch();
    };
    const onUpdated = (payload: Record<string, unknown>) => {
      if (payload?._id === id || payload?.id === id) refetch();
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

  const canDownload = Boolean(
    order
      && order.paymentStatus === "PAID"
      && DOWNLOADABLE_STATUSES.includes(order.status)
      && order.userId === (user?._id ?? user?.id)
  );

  const handleDownload = async (bookId: string) => {
    if (downloadingBookId) return;
    setDownloadingBookId(bookId);
    setDownloadError(null);
    try {
      await api.downloadBook(bookId);
    } catch (downloadFailure) {
      setDownloadError({
        bookId,
        message: downloadFailure instanceof Error
          ? downloadFailure.message
          : "No se pudo descargar el e-book.",
      });
    } finally {
      setDownloadingBookId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-4 max-w-3xl">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-40 w-full" />
        <div className="skeleton h-60 w-full" />
      </div>
    );
  }
  if (error) return <p className="text-danger">{error}</p>;
  if (!order) return <p>No encontrado</p>;

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-ink-500">Pedido</p>
          <h1 className="font-display text-3xl font-bold text-ink-950">#{order._id.slice(-6)}</h1>
        </div>
        <OrderCard order={order} />
      </div>

      <div className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
        <h2 className="mb-4 font-display text-lg font-bold text-ink-950">Estado del pedido</h2>
        <StatusTimeline status={order.status} />
      </div>

      {shipment && (
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
          <h2 className="mb-3 font-display text-lg font-bold text-ink-950">Información de envío</h2>
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div className="flex items-start gap-2">
              <Truck className="mt-0.5 h-4 w-4 text-accent" />
              <div>
                <dt className="text-ink-500">Transportista</dt>
                <dd className="text-ink-950">{shipment.carrier || "Pendiente"}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Hash className="mt-0.5 h-4 w-4 text-accent" />
              <div>
                <dt className="text-ink-500">Código de seguimiento</dt>
                <dd className="break-all font-mono text-ink-950">
                  {shipment.trackingCode || "Pendiente"}
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <PackageCheck className="mt-0.5 h-4 w-4 text-accent" />
              <div>
                <dt className="text-ink-500">Estado del envío</dt>
                <dd className="text-ink-950">{SHIPMENT_STATUS_LABEL[shipment.status]}</dd>
              </div>
            </div>
          </dl>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
        <h2 className="mb-3 font-display text-lg font-bold text-ink-950">Artículos</h2>
        {canDownload && (
          <p className="mb-3 text-xs text-ink-500">
            Las descargas son ediciones de demostración generadas para este laboratorio.
          </p>
        )}
        <ul className="flex flex-col divide-y divide-border">
          {order.items.map((i) => (
            <li key={i.bookId} className="flex flex-col gap-2 py-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                    <Package className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="break-words text-ink-700">
                    {i.title} <span className="text-ink-500">×{i.quantity}</span>
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="font-semibold text-ink-950">${(i.price * i.quantity).toFixed(2)}</span>
                  {canDownload && (
                    <button
                      type="button"
                      onClick={() => handleDownload(i.bookId)}
                      disabled={downloadingBookId !== null}
                      aria-busy={downloadingBookId === i.bookId}
                      className="btn-press inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent to-accent-violet px-3 py-2 text-xs font-semibold text-white shadow-soft hover:shadow-lift disabled:opacity-60"
                    >
                      {downloadingBookId === i.bookId ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                          Descargando...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4" aria-hidden="true" />
                          Descargar e-book
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
              {downloadError?.bookId === i.bookId && (
                <p role="alert" className="text-danger">{downloadError.message}</p>
              )}
            </li>
          ))}
        </ul>
        <div className="mt-3 flex justify-between border-t border-border pt-3 font-display text-lg font-bold text-ink-950">
          <span>Total</span>
          <span className="text-accent">${order.total.toFixed(2)}</span>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
        <h2 className="mb-3 font-display text-lg font-bold text-ink-950">Detalles</h2>
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 text-accent" />
            <div>
              <dt className="text-ink-500">Dirección</dt>
              <dd className="text-ink-950">{order.address}</dd>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CreditCard className="mt-0.5 h-4 w-4 text-accent" />
            <div>
              <dt className="text-ink-500">Pago</dt>
              <dd className="text-ink-950">{order.paymentStatus}</dd>
            </div>
          </div>
          {order.createdAt && (
            <div className="flex items-start gap-2">
              <Calendar className="mt-0.5 h-4 w-4 text-accent" />
              <div>
                <dt className="text-ink-500">Creado</dt>
                <dd className="text-ink-950">{new Date(order.createdAt).toLocaleString()}</dd>
              </div>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
}