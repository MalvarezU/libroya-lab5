import type {
  AuthResponse,
  Book,
  Order,
  Payment,
  PaypalOrder,
  RegisterResponse,
  User,
} from "./types";

export const API_BASE =
  (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("libroYa_token");
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
  let data: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!res.ok) {
    const msg =
      (typeof data === "object" && data !== null && "message" in data
        ? String((data as { message: unknown }).message)
        : null) || res.statusText || "Request failed";
    throw new ApiError(res.status, msg, data);
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

  createOrder: (items: { bookId: string; quantity: number }[], address: string) =>
    request<Order>("/api/orders", {
      method: "POST",
      body: JSON.stringify({ items, address }),
      auth: true,
    }),

  getMyOrders: () => request<Order[]>("/api/orders/mine", { auth: true }),

  getAllOrders: () => request<Order[]>("/api/orders", { auth: true }),

  getOrder: (id: string) => request<Order>(`/api/orders/${id}`, { auth: true }),

  updateOrderStatus: (id: string, status: Order["status"]) =>
    request<Order>(`/api/orders/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
      auth: true,
    }),

  createPaypalOrder: (orderId: string) =>
    request<{ payment: Payment; paypalOrder: PaypalOrder; providerOrderId?: string }>(
      `/api/payments/orders/${orderId}/paypal`,
      { method: "POST", auth: true }
    ),

  capturePayment: (orderId: string, providerOrderId?: string) =>
    request<{ payment: Payment; order: Order }>(`/api/payments/orders/${orderId}/capture`, {
      method: "POST",
      body: JSON.stringify(providerOrderId ? { providerOrderId } : {}),
      auth: true,
    }),
};

export type { User };
