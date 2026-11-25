const Book = require('../models/Book');
const Order = require('../models/Order');
const socket = require('../socket');

const TRANSITIONS = {
  // PAID is set ONLY by the PayPal capture flow, never by the operator endpoint.
  PENDING_PAYMENT: null,
  PAID: 'PREPARING',
  PREPARING: 'SHIPPED',
  SHIPPED: 'DELIVERED',
  DELIVERED: null,
};

async function create(req, res, next) {
  try {
    const { items, address } = req.body;
    const userId = req.user.id;

    // Recompute total from DB prices and validate stock.
    const resolved = [];
    let total = 0;
    for (const it of items) {
      const book = await Book.findById(it.bookId);
      if (!book) return next({ status: 404, message: `Book not found: ${it.bookId}` });
      if (!book.available) return next({ status: 400, message: `Book not available: ${book.title}` });
      if (book.stock < it.quantity) {
        return next({ status: 400, message: `Insufficient stock for ${book.title}` });
      }
      total += book.price * it.quantity;
      resolved.push({ book, quantity: it.quantity });
    }

    // Decrement stock on the server.
    for (const { book, quantity } of resolved) {
      book.stock -= quantity;
      await book.save();
    }

    const orderItems = resolved.map(({ book, quantity }) => ({
      bookId: book._id,
      title: book.title,
      price: book.price,
      quantity,
    }));

    const order = await Order.create({
      userId,
      items: orderItems,
      address,
      total,
      status: 'PENDING_PAYMENT',
      paymentStatus: 'UNPAID',
    });

    return res.status(201).json(order);
  } catch (err) {
    return next(err);
  }
}

async function listMine(req, res, next) {
  try {
    const orders = await Order.find({ userId: req.user.id }).sort({ createdAt: -1 });
    return res.json(orders);
  } catch (err) {
    return next(err);
  }
}

async function getById(req, res, next) {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return next({ status: 404, message: 'Order not found' });
    const isOwner = order.userId.toString() === req.user.id;
    const isOp = req.user.role === 'operador';
    if (!isOwner && !isOp) return next({ status: 403, message: 'Forbidden' });
    return res.json(order);
  } catch (err) {
    return next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const { status: newStatus } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return next({ status: 404, message: 'Order not found' });

    const expected = TRANSITIONS[order.status];
    if (!expected || expected !== newStatus) {
      return next({ status: 400, message: `Invalid transition: ${order.status} -> ${newStatus}` });
    }

    order.status = newStatus;
    await order.save();

    try {
      socket.emitOrderStatusChanged(order);
      socket.emitOrderUpdated(order);
    } catch (e) {
      // socket not initialized; ignore
    }

    return res.json(order);
  } catch (err) {
    return next(err);
  }
}

async function listAll(req, res, next) {
  try {
    const orders = await Order.find({}).sort({ createdAt: -1 });
    return res.json(orders);
  } catch (err) {
    return next(err);
  }
}

module.exports = { create, listMine, getById, updateStatus, listAll };