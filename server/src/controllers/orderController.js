const mongoose = require('mongoose');
const crypto = require('node:crypto');
const Book = require('../models/Book');
const Order = require('../models/Order');
const Shipment = require('../models/Shipment');
const { isValidObjectId } = require('../utils/objectId');
const socket = require('../socket');

const TRANSITIONS = {
  // PAID is set ONLY by the PayPal capture flow, never by the operator endpoint.
  PENDING_PAYMENT: null,
  PAID: 'PREPARING',
  PREPARING: 'SHIPPED',
  SHIPPED: 'DELIVERED',
  DELIVERED: null,
};

function buildCheckoutHash(items, address) {
  const quantities = new Map();
  for (const item of items) {
    quantities.set(item.bookId, (quantities.get(item.bookId) || 0) + item.quantity);
  }
  const canonicalItems = [...quantities]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([bookId, quantity]) => ({ bookId, quantity }));
  return crypto
    .createHash('sha256')
    .update(JSON.stringify({ address, items: canonicalItems }))
    .digest('hex');
}

async function findCheckoutOrder(userId, checkoutKey, session) {
  const query = Order.findOne({ userId, checkoutKey });
  if (session) query.session(session);
  return query;
}

function assertCheckoutHash(existing, checkoutHash) {
  if (existing.checkoutHash !== checkoutHash) {
    throw { status: 409, message: 'Idempotency-Key was already used for a different checkout' };
  }
}

async function create(req, res, next) {
  const checkoutKey = req.idempotencyKey;
  if (!checkoutKey) return next({ status: 400, message: 'Idempotency-Key is required' });

  const userId = req.user.id;
  const address = req.body.address.trim();
  const checkoutHash = buildCheckoutHash(req.body.items, address);
  const session = await mongoose.startSession();
  try {
    const { items } = req.body;

    // Merge duplicate lines so a client cannot bypass stock validation.
    const quantities = new Map();
    for (const item of items) {
      quantities.set(item.bookId, (quantities.get(item.bookId) || 0) + item.quantity);
    }

    let order;
    let created = false;
    await session.withTransaction(async () => {
      const existing = await findCheckoutOrder(userId, checkoutKey, session);
      if (existing) {
        assertCheckoutHash(existing, checkoutHash);
        order = existing;
        return;
      }

      const resolved = [];
      let total = 0;

      for (const [bookId, quantity] of quantities) {
        // Atomic conditional decrement prevents overselling under concurrency.
        const book = await Book.findOneAndUpdate(
          { _id: bookId, available: true, stock: { $gte: quantity } },
          { $inc: { stock: -quantity } },
          { new: true, session }
        );

        if (!book) {
          const existingBook = await Book.findById(bookId).session(session);
          if (!existingBook) throw { status: 404, message: `Book not found: ${bookId}` };
          if (!existingBook.available) throw { status: 400, message: `Book not available: ${existingBook.title}` };
          throw { status: 400, message: `Insufficient stock for ${existingBook.title}` };
        }

        total += book.price * quantity;
        resolved.push({ book, quantity });
      }

      const orderItems = resolved.map(({ book, quantity }) => ({
        bookId: book._id,
        title: book.title,
        price: book.price,
        quantity,
      }));

      [order] = await Order.create(
        [{
          userId,
          items: orderItems,
          address,
          total,
          checkoutKey,
          checkoutHash,
          status: 'PENDING_PAYMENT',
          paymentStatus: 'UNPAID',
        }],
        { session }
      );
      created = true;
    });

    return res.status(created ? 201 : 200).json(order);
  } catch (err) {
    // A concurrent request can win the unique index after our first lookup.
    // Its committed transaction rolled back our stock changes, so re-read safely.
    if (err.code === 11000) {
      try {
        const existing = await findCheckoutOrder(userId, checkoutKey);
        if (existing) {
          assertCheckoutHash(existing, checkoutHash);
          return res.status(200).json(existing);
        }
      } catch (lookupErr) {
        return next(lookupErr);
      }
    }
    return next(err);
  } finally {
    await session.endSession();
  }
}

async function cancel(req, res, next) {
  if (!isValidObjectId(req.params.id)) {
    return next({ status: 400, message: 'Invalid order ID' });
  }
  try {
    // Load lazily so shipment-only callers do not initialize payment concerns.
    const { cancelPendingOrder } = require('../services/orderCancellation');
    const { order } = await cancelPendingOrder(req.params.id, { userId: req.user.id });
    return res.json(order);
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
    if (!isValidObjectId(req.params.id)) {
      return next({ status: 400, message: 'Invalid order ID' });
    }
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
  if (!mongoose.isValidObjectId(req.params.id)) {
    return next({ status: 400, message: 'Invalid order ID' });
  }

  let session;
  try {
    const { status: newStatus, carrier, trackingCode } = req.body;
    session = await mongoose.startSession();
    let order;

    await session.withTransaction(async () => {
      order = await Order.findById(req.params.id).session(session);
      if (!order) throw { status: 404, message: 'Order not found' };

      const expected = TRANSITIONS[order.status];
      if (!expected || expected !== newStatus) {
        throw { status: 400, message: `Invalid transition: ${order.status} -> ${newStatus}` };
      }

      if (newStatus === 'SHIPPED' && (!carrier?.trim() || !trackingCode?.trim())) {
        throw { status: 400, message: 'Carrier and tracking code are required for SHIPPED' };
      }

      const shipmentData = { address: order.address, status: newStatus };
      if (newStatus === 'SHIPPED') {
        shipmentData.carrier = carrier.trim();
        shipmentData.trackingCode = trackingCode.trim();
      }

      await Shipment.findOneAndUpdate(
        { orderId: order._id },
        { $set: shipmentData },
        { upsert: true, new: true, session, runValidators: true }
      );

      order.status = newStatus;
      await order.save({ session });
    });

    try {
      socket.emitOrderStatusChanged(order);
      socket.emitOrderUpdated(order);
    } catch (e) {
      // socket not initialized; ignore
    }

    return res.json(order);
  } catch (err) {
    return next(err);
  } finally {
    if (session) await session.endSession();
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

module.exports = { create, cancel, listMine, getById, updateStatus, listAll, buildCheckoutHash };