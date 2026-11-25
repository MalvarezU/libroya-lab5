export type Role = "cliente" | "operador";

export interface User {
  _id: string;
  id?: string;
  name: string;
  email: string;
  role: Role;
}

export interface Book {
  _id: string;
  title: string;
  author: string;
  isbn?: string;
  category?: string;
  price: number;
  stock: number;
  coverUrl?: string;
  available: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrderItem {
  bookId: string;
  title: string;
  price: number;
  quantity: number;
}

export type OrderStatus =
  | "PENDING_PAYMENT"
  | "PAID"
  | "PREPARING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED";

export interface Order {
  _id: string;
  userId: string;
  items: OrderItem[];
  address: string;
  total: number;
  status: OrderStatus;
  paymentStatus: "UNPAID" | "PAID";
  checkoutKey?: string;
  checkoutHash?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type ShipmentStatus = "PENDING" | "PREPARING" | "SHIPPED" | "DELIVERED";

export interface Shipment {
  _id: string;
  orderId: string;
  address: string;
  carrier?: string;
  trackingCode?: string;
  status: ShipmentStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface ShipmentTracking {
  carrier: string;
  trackingCode: string;
}

export interface Payment {
  _id: string;
  orderId: string;
  providerOrderId: string;
  captureId?: string;
  amount: number;
  currency: string;
  status: "CREATED" | "APPROVED" | "CAPTURED" | "FAILED" | "CANCELLED";
}

export interface PaypalOrder {
  id: string;
  status?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface RegisterResponse {
  _id: string;
  name: string;
  email: string;
  role: Role;
}
