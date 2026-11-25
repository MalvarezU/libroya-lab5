"use client";

import { io, Socket } from "socket.io-client";
import { API_BASE } from "./api";

let socket: Socket | null = null;
let boundToken: string | null = null;

export function getSocket(token: string): Socket {
  if (socket && boundToken === token) {
    if (!socket.connected) socket.connect();
    return socket;
  }
  // Identity changed: never reuse a socket authenticated as another user.
  if (socket) socket.disconnect();
  boundToken = token;
  socket = io(API_BASE, {
    auth: { token },
    transports: ["websocket", "polling"],
    autoConnect: true,
    reconnection: true,
  });
  return socket;
}

export function disconnectSocket() {
  if (socket) socket.disconnect();
  socket = null;
  boundToken = null;
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
