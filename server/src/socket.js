const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('./config/env');

let io = null;

function initSocket(server, httpServer) {
  const httpSrv = httpServer || server;
  io = new Server(httpSrv, {
    cors: { origin: config.clientOrigin, credentials: true },
  });

  // JWT auth on handshake. Never trust room name from client.
  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth && socket.handshake.auth.token
          ? socket.handshake.auth.token
          : (socket.handshake.headers.authorization || '').replace(/^Bearer\s+/i, '');
      if (!token) return next(new Error('Authentication required'));
      const payload = jwt.verify(token, config.jwtSecret);
      socket.user = { id: payload.id, role: payload.role };
      return next();
    } catch (err) {
      return next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;
    // Join rooms based on verified identity only.
    if (user.role === 'operador') {
      socket.join('ops');
    }
    socket.join(`user:${user.id}`);

    socket.on('disconnect', () => {
      // nothing special
    });
  });

  return io;
}

function getIO() {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
}

function opsSummary(order) {
  return {
    _id: order._id,
    status: order.status,
    total: order.total,
    createdAt: order.createdAt,
    items: (order.items || []).map((i) => ({ title: i.title, quantity: i.quantity })),
  };
}

function emitOrderCreated(order) {
  if (!io) return;
  io.to('ops').emit('order:created', opsSummary(order));
}

function emitOrderStatusChanged(order) {
  if (!io) return;
  const summary = opsSummary(order);
  io.to('ops').emit('order:status_changed', summary);
  io.to(`user:${order.userId}`).emit('order:status_changed', order);
}

function emitOrderUpdated(order) {
  if (!io) return;
  io.to(`user:${order.userId}`).emit('order:updated', order);
}

module.exports = {
  initSocket,
  getIO,
  emitOrderCreated,
  emitOrderStatusChanged,
  emitOrderUpdated,
};