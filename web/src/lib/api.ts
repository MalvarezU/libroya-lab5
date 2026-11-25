import type {
  AuthResponse,
  Book,
  Order,
  Payment,
  PaypalOrder,
  RegisterResponse,
  Shipment,
  ShipmentTracking,
  User,
} from "./types";

export const API_BASE =
  (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("libroYa_token");
}

export function parseApiError(data: unknown, statusText = "Request failed"): string {
  if (typeof data !== "object" || data === null) {
    return typeof data === "string" && data.trim() ? data.slice(0, 300) : statusText;
  }

  const payload = data as Record<string, unknown>;
  const errorMessage = typeof payload.error === "string" ? payload.error.trim() : "";
  const legacyMessage = typeof payload.message === "string" ? payload.message.trim() : "";
  const message = errorMessage || legacyMessage || statusText;

  if (message === "Validation error" && Array.isArray(payload.details)) {
    const details = payload.details
      .filter((detail): detail is { path?: unknown; message?: unknown } => (
        typeof detail === "object" && detail !== null
      ))
      .map((detail) => {
        const path = typeof detail.path === "string" ? detail.path : "request";
        const detailMessage = typeof detail.message === "string" ? detail.message : "Invalid value";
        return `${path}: ${detailMessage}`;
      })
      .slice(0, 4)
      .join("; ");
    if (details) return `${message}: ${details}`.slice(0, 500);
  }

  return message.slice(0, 300);
}

export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function readResponseData(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function getDownloadFilename(header: string | null, bookId: string): string {
  const quoted = header?.match(/;\s*filename="([^"]*)"/i)?.[1];
  const bare = header?.match(/;\s*filename=([^;]*)/i)?.[1];
  const basename = (quoted ?? bare ?? "").replace(/\\/g, "/").split("/").pop() ?? "";
  const safeName = basename
    .replace(/[^A-Za-z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (safeName.toLowerCase().endsWith(".txt")) return safeName;

  const safeId = bookId.replace(/[^A-Za-z0-9_-]/g, "") || "book";
  return `${safeId}-demo-edition.txt`;
}

async function request<T>(
  path: string,
  options: RequestInit & { auth?: boolean } = {}
): Promise<T> {
  const { auth = false, headers, ...rest } = options;
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (headers) Object.assign(h, headers as Record<string, string>);
  if (auth) {
    const t = getToken();
    if (t) h.Authorization = `Bearer ${t}`;
  }
  const res = await fetch(`${API_BASE}${path}`, { ...rest, headers: h });
  const data = await readResponseData(res);
  if (!res.ok) {
    throw new ApiError(res.status, parseApiError(data, res.statusText), data);
  }
  return data as T;
}

export const api = {
  register: (name: string, email: string, password: string) =>
    request<RegisterResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    }),

  login: (email: string, password: string) =>
    request<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  getBooks: (category?: string) => {
    const q = category ? `?category=${encodeURIComponent(category)}` : "";
    return request<Book[]>(`/api/books${q}`);
  },

  getBook: (id: string) => request<Book>(`/api/books/${id}`),

  downloadBook: async (bookId: string): Promise<void> => {
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(
      `${API_BASE}/api/books/${encodeURIComponent(bookId)}/download`,
      { headers, cache: "no-store" }
    );
    if (!res.ok) {
      const data = await readResponseData(res);
      throw new ApiError(res.status, parseApiError(data, res.statusText), data);
    }

    const blob = await res.blob();
    const filename = getDownloadFilename(res.headers.get("Content-Disposition"), bookId);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.rel = "noopener";
    link.style.display = "none";

    try {
      document.body.appendChild(link);
      link.click();
    } finally {
      link.remove();
      globalThis.setTimeout(() => URL.revokeObjectURL(url), 0);
    }
  },

  createBook: (data: Partial<Book>) =>
    request<Book>("/api/books", {
      method: "POST",
      body: JSON.stringify(data),
      auth: true,
    }),

  updateBook: (id: string, data: Partial<Book>) =>
    request<Book>(`/api/books/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
      auth: true,
    }),

  deleteBook: (id: string) =>
    request<void>(`/api/books/${id}`, { method: "DELETE", auth: true }),

  createOrder: (
    items: { bookId: string; quantity: number }[],
    address: string,
    idempotencyKey: string
  ) =>
    request<Order>("/api/orders", {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
      body: JSON.stringify({ items, address }),
      auth: true,
    }),

  cancelOrder: (id: string) =>
    request<Order>(`/api/orders/${id}/cancel`, { method: "POST", auth: true }),

  getMyOrders: () => request<Order[]>("/api/orders/mine", { auth: true }),

  getAllOrders: () => request<Order[]>("/api/orders", { auth: true }),

  getOrder: (id: string) => request<Order>(`/api/orders/${id}`, { auth: true }),

  updateOrderStatus: (id: string, status: Order["status"], shipment?: ShipmentTracking) =>
    request<Order>(`/api/orders/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, ...shipment }),
      auth: true,
    }),

  getShipmentByOrder: (orderId: string) =>
    request<Shipment>(`/api/shipments/order/${orderId}`, { auth: true }),

  updateShipment: (orderId: string, shipment: ShipmentTracking) =>
    request<Shipment>(`/api/shipments/order/${orderId}`, {
      method: "PUT",
      body: JSON.stringify(shipment),
      auth: true,
    }),

  createPaypalOrder: (orderId: string) =>
    request<{
      payment: Payment;
      paypalOrder?: PaypalOrder;
      providerOrderId?: string;
      alreadyCaptured?: boolean;
    }>(
      `/api/payments/orders/${orderId}/paypal`,
      { method: "POST", auth: true }
    ),

  capturePayment: (orderId: string, providerOrderId?: string) =>
    request<{ payment: Payment; order: Order; alreadyCaptured?: boolean }>(
      `/api/payments/orders/${orderId}/capture`,
      {
        method: "POST",
        body: JSON.stringify(providerOrderId ? { providerOrderId } : {}),
        auth: true,
      }
    ),
};

export type { User };
