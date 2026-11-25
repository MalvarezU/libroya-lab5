const mongoose = require('mongoose');
const Book = require('../models/Book');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const { isValidObjectId } = require('../utils/objectId');
const socket = require('../socket');

function emitCancellation(order) {
  try {
    socket.emitOrderStatusChanged(order);
    socket.emitOrderUpdated(order);
  } catch {
    // Socket.IO may not be initialized in scripts or tests.
  }
}

async function cancelPendingOrder(orderId, { userId, allowSystem = false } = {}) {
  if (!isValidObjectId(orderId)) throw { status: 400, message: 'Invalid order ID' };
  if (!allowSystem && !userId) throw { status: 401, message: 'Authentication required' };

  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      const order = await Order.findById(orderId).session(session);
      if (!order) throw { status: 404, message: 'Order not found' };
      if (!allowSystem && order.userId.toString() !== userId) {
        throw { status: 403, message: 'Forbidden' };
      }
      if (order.status === 'CANCELLED') {
        result = { order, cancelled: false };
        return;
      }
      if (order.status !== 'PENDING_PAYMENT') {
        throw { status: 409, message: 'Only PENDING_PAYMENT orders can be cancelled' };
      }

      const payment = await Payment.findOne({ orderId: order._id }).sort({ createdAt: -1 }).session(session);
      if (payment && payment.status === 'CAPTURED') {
        throw { status: 409, message: 'A captured payment cannot be cancelled' };
      }

      for (const item of order.items) {
        const book = await Book.findByIdAndUpdate(
          item.bookId,
          { $inc: { stock: item.quantity } },
          { new: true, session }
        );
        if (!book) {
          throw { status: 409, message: `Unable to release stock for book ${item.bookId}` };
        }
      }

      const cancelledOrder = await Order.findOneAndUpdate(
        { _id: order._id, status: 'PENDING_PAYMENT' },
        { $set: { status: 'CANCELLED' } },
        { new: true, session }
      );
      if (!cancelledOrder) {
        const current = await Order.findById(orderId).session(session);
        if (current && current.status === 'CANCELLED') {
          result = { order: current, cancelled: false };
          return;
        }
        throw { status: 409, message: 'Order changed while it was being cancelled' };
      }

      if (payment) {
        await Payment.updateOne(
          { _id: payment._id, status: { $ne: 'CAPTURED' } },
          { $set: { status: 'CANCELLED' } },
          { session }
        );
      }
      result = { order: cancelledOrder, cancelled: true };
    });

    if (result.cancelled) emitCancellation(result.order);
    return result;
  } finally {
    await session.endSession();
  }
}

module.exports = { cancelPendingOrder };
