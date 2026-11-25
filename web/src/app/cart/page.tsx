"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { api } from "@/lib/api";
import { useCart } from "@/lib/cart";
import type { Order } from "@/lib/types";

const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "";

export default function CartPage() {
  const { items, updateQty, remove, clear, total } = useCart();
  const router = useRouter();
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);

  if (items.length === 0 && !success) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <p className="text-zinc-500">Tu carrito está vacío.</p>
        <a href="/" className="text-indigo-600 hover:underline">Ir al catálogo</a>
      </div>
    );
  }

  if (!clientId) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-700">
        Falta configurar NEXT_PUBLIC_PAYPAL_CLIENT_ID.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Carrito</h1>
        {items.map((i) => (
          <div key={i.book._id} className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="h-16 w-12 flex-shrink-0 overflow-hidden rounded bg-zinc-100 dark:bg-zinc-800">
              {i.book.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={i.book.coverUrl} alt={i.book.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">📖</div>
              )}
            </div>
            <div className="flex-1">
              <p className="font-medium">{i.book.title}</p>
              <p className="text-sm text-zinc-500">${i.book.price.toFixed(2)}</p>
            </div>
            <input
              type="number"
              min={1}
              max={i.book.stock}
              value={i.quantity}
              onChange={(e) => updateQty(i.book._id, Number(e.target.value))}
              className="w-16 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
            <button onClick={() => remove(i.book._id)} className="text-sm text-red-600 hover:underline">
              Quitar
            </button>
          </div>
        ))}
        <div className="text-right text-lg font-bold">Total: ${total.toFixed(2)}</div>
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-bold">Envío y pago</h2>
        <textarea
          placeholder="Dirección de envío"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="min-h-[100px] rounded-md border border-zinc-300 p-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        {success && <p className="text-green-600 text-sm">{success}</p>}

        <PayPalScriptProvider options={{ clientId, currency: "USD" }}>
          <PayPalButtons
            style={{ layout: "vertical" }}
            disabled={!address.trim() || items.length === 0}
            createOrder={async () => {
              setError(null);
              try {
                const order = await api.createOrder(
                  items.map((i) => ({ bookId: i.book._id, quantity: i.quantity })),
                  address.trim()
                );
                setOrderId(order._id);
                const pp = await api.createPaypalOrder(order._id);
                return pp.paypalOrder.id || pp.providerOrderId || pp.payment.providerOrderId;
              } catch (e: any) {
                setError(e?.message || "Error creando pedido");
                throw e;
              }
            }}
            onApprove={async (data) => {
              if (!orderId) return;
              try {
                const res = await api.capturePayment(orderId, data.orderID);
                setSuccess("Pago completado. Redirigiendo...");
                clear();
                router.push(`/orders/${res.order._id}`);
              } catch (e: any) {
                setError(e?.message || "Error capturando pago");
              }
            }}
            onError={(err) => {
              console.error(err);
              setError("Error en PayPal");
            }}
          />
        </PayPalScriptProvider>
      </div>
    </div>
  );
}
