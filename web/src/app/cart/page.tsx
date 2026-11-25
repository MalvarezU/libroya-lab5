"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { ShoppingCart, Minus, Plus, Truck, PackageCheck, X } from "lucide-react";
import { api } from "@/lib/api";
import { useCart } from "@/lib/cart";


const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "";
const FREE_SHIPPING_THRESHOLD = 30;

export default function CartPage() {
  const { items, updateQty, remove, clear, total } = useCart();
  const router = useRouter();
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  if (items.length === 0 && !success) {
    return (
      <div className="flex flex-col items-center gap-5 py-20 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent-soft text-accent">
          <ShoppingCart className="h-10 w-10" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-950">Tu carrito está vacío</h1>
          <p className="mt-1 text-sm text-ink-500">Agrega libros desde el catálogo para comenzar.</p>
        </div>
        <Link href="/" className="btn-press inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent to-accent-violet px-5 py-3 text-sm font-semibold text-white shadow-soft">
          Ir al catálogo
        </Link>
      </div>
    );
  }

  if (!clientId) {
    return (
      <div className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-danger">
        Falta configurar NEXT_PUBLIC_PAYPAL_CLIENT_ID.
      </div>
    );
  }

  const shippingProgress = Math.min(100, (total / FREE_SHIPPING_THRESHOLD) * 100);
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - total);

  const step = address.trim() ? 2 : 1;
  return (
    <div className="flex flex-col gap-6">
      {/* Step indicator */}
      <ol className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-soft">
        {[
          { n: 1, label: "Dirección" },
          { n: 2, label: "Pago" },
        ].map((s, idx) => (
          <li key={s.n} className="flex flex-1 items-center gap-3">
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                step >= s.n ? "bg-gradient-to-br from-accent to-accent-violet text-white" : "bg-border text-ink-500"
              }`}
            >
              {s.n}
            </span>
            <span className={`text-sm font-medium ${step >= s.n ? "text-ink-950" : "text-ink-500"}`}>{s.label}</span>
            {idx === 0 && <div className="h-px flex-1 bg-border" />}
          </li>
        ))}
      </ol>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="flex flex-col gap-5 lg:col-span-2">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold text-ink-950">Carrito</h1>
          <span className="text-sm text-ink-500">{items.length} {items.length === 1 ? "artículo" : "artículos"}</span>
        </div>

        {/* Free shipping progress */}
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-soft">
          <div className="flex items-center gap-2 text-sm">
            <Truck className="h-4 w-4 text-accent" />
            {remaining > 0 ? (
              <span className="text-ink-700">
                Agrega <span className="font-semibold text-accent">${remaining.toFixed(2)}</span> más para envío gratis
              </span>
            ) : (
              <span className="font-semibold text-success">¡Tienes envío gratis!</span>
            )}
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent to-accent-violet transition-all duration-500"
              style={{ width: `${shippingProgress}%` }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {items.map((i) => (
            <div key={i.book._id} className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 shadow-soft">
              <Link href={`/books/${i.book._id}`} className="h-20 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-accent-soft/40">
                {i.book.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={i.book.coverUrl} alt={i.book.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-accent/60">
                    <ShoppingCart className="h-5 w-5" />
                  </div>
                )}
              </Link>
              <div className="flex-1 min-w-0">
                <Link href={`/books/${i.book._id}`} className="font-display font-semibold text-ink-950 hover:text-accent line-clamp-1">
                  {i.book.title}
                </Link>
                <p className="text-sm text-ink-500">{i.book.author}</p>
                <p className="mt-1 text-sm font-semibold text-accent">${i.book.price.toFixed(2)}</p>
              </div>
              <div className="flex items-center rounded-xl border border-border bg-canvas">
                <button
                  type="button"
                  onClick={() => updateQty(i.book._id, i.quantity - 1)}
                  className="btn-press flex h-9 w-9 items-center justify-center text-ink-700 hover:bg-accent-soft"
                  aria-label="Disminuir"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-8 text-center text-sm font-semibold text-ink-950">{i.quantity}</span>
                <button
                  type="button"
                  onClick={() => updateQty(i.book._id, Math.min(i.book.stock, i.quantity + 1))}
                  disabled={i.quantity >= i.book.stock}
                  className="btn-press flex h-9 w-9 items-center justify-center text-ink-700 hover:bg-accent-soft disabled:opacity-40"
                  aria-label="Aumentar"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="text-right">
                <p className="font-display font-bold text-ink-950">${(i.book.price * i.quantity).toFixed(2)}</p>
                <button
                  onClick={() => setConfirmRemove(i.book._id)}
                  className="mt-1 text-xs text-danger hover:underline"
                >
                  Quitar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Order summary */}
      <aside className="lg:col-span-1">
        <div className="sticky top-24 flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 shadow-soft">
          <h2 className="font-display text-lg font-bold text-ink-950">Resumen del pedido</h2>
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between text-ink-700">
              <span>Subtotal</span>
              <span>${total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-ink-700">
              <span>Envío</span>
              <span>{total >= FREE_SHIPPING_THRESHOLD ? "Gratis" : "Calculado al pagar"}</span>
            </div>
            <div className="border-t border-border pt-2 flex justify-between font-display text-lg font-bold text-ink-950">
              <span>Total</span>
              <span className="text-accent">${total.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-ink-700">Dirección de envío</label>
            <textarea
              placeholder="Calle, número, ciudad, código postal"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="min-h-[90px] rounded-xl border border-border bg-canvas p-3 text-sm text-ink-950 placeholder:text-ink-300 focus:border-accent"
            />
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}
          {success && (
            <div className="flex items-center gap-2 rounded-xl bg-success/15 p-3 text-sm font-medium text-success">
              <PackageCheck className="h-4 w-4" /> {success}
            </div>
          )}

          <div className="rounded-xl border border-border bg-canvas p-2">
            <PayPalScriptProvider options={{ clientId, currency: "USD" }}>
              <PayPalButtons
                style={{ layout: "vertical", shape: "rect", label: "paypal" }}
                disabled={!address.trim() || items.length === 0 || capturing}
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
                  } catch (e: unknown) {
                    setError((e as { message?: string })?.message || "Error creando pedido");
                    throw e;
                  }
                }}
                onApprove={async (data) => {
                  if (!orderId) return;
                  setCapturing(true);
                  try {
                    const res = await api.capturePayment(orderId, data.orderID);
                    setSuccess("Pago completado. Redirigiendo...");
                    clear();
                    router.push(`/orders/${res.order._id}`);
                  } catch (e: unknown) {
                    setError((e as { message?: string })?.message || "Error capturando pago");
                  } finally {
                    setCapturing(false);
                  }
                }}
                onError={(err) => {
                  console.error(err);
                  setError("Error en PayPal");
                }}
              />
            </PayPalScriptProvider>
          </div>
          {capturing && (
            <div className="flex items-center justify-center gap-2 text-sm text-ink-500">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-accent" />
              Procesando pago...
            </div>
          )}
        </div>
      </aside>
      </div>

      {/* Remove confirmation modal */}
      {confirmRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-lift">
            <div className="flex items-start justify-between">
              <h3 className="font-display text-lg font-bold text-ink-950">Quitar artículo</h3>
              <button onClick={() => setConfirmRemove(null)} className="text-ink-500 hover:text-ink-950">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-2 text-sm text-ink-500">¿Seguro que quieres quitar este libro del carrito?</p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setConfirmRemove(null)}
                className="btn-press flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-ink-700 hover:bg-accent-soft"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  remove(confirmRemove);
                  setConfirmRemove(null);
                }}
                className="btn-press flex-1 rounded-xl bg-danger px-4 py-2.5 text-sm font-semibold text-white hover:bg-danger/90"
              >
                Quitar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

