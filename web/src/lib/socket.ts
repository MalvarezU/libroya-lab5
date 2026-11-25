"use client";

import { io, Socket } from "socket.io-client";
import { API_BASE } from "./api";

let socket: Socket | null = null;

export function getSocket(token: string): Socket {
  if (socket && socket.connected) return socket;
  if (socket) {
    socket.auth = { token };
    socket.connect();
    return socket;
  }
  socket = io(API_BASE, {
    auth: { token },
    transports: ["websocket", "polling"],
    autoConnect: true,
    reconnection: true,
  });
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function onEvent<T = unknown>(
  socket: Socket,
  event: string,
  handler: (payload: T) => void
): () => void {
  socket.on(event, handler);
  return () => {
    socket.off(event, handler);
  };
}
