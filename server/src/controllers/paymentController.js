const mongoose = require('mongoose');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const {
  createOrder: paypalCreate,
  captureOrder: paypalCapture,
  getOrderDetails: paypalGetOrderDetails,
  PayPalApiError,
} = require('../utils/paypal');
const { isValidObjectId } = require('../utils/objectId');
const socket = require('../socket');

function isOwner(order, user) {
  return order.userId.toString() === user.id;
}

function isPendingPayment(order) {
  return order.status === 'PENDING_PAYMENT' && order.paymentStatus === 'UNPAID';
}

function findPayment(orderId, session) {
  const query = Payment.findOne({ orderId }).sort({ createdAt: -1 });
  if (session) query.session(session);
  return query;
}

function verifyCapture(response, payment, order) {
  if (!response || response.id !== payment.providerOrderId) {
    throw { status: 400, message: 'PayPal provider order identifier mismatch' };
  }

  const purchaseUnit = (response.purchase_units || [])[0] || {};
  if (purchaseUnit.custom_id !== order._id.toString()) {
    throw { status: 400, message: 'PayPal order identifier mismatch' };
  }

  const capture = (purchaseUnit.payments?.captures || [])[0] || {};
  if (typeof capture.id !== 'string' || !capture.id.trim()) {
    throw { status: 400, message: 'PayPal capture identifier is missing' };
  }
  if (capture.status !== 'COMPLETED') {
    throw { status: 400, message: 'PayPal capture is not completed' };
  }

  const rawAmount = capture.amount?.value;
  const amountText = typeof rawAmount === 'string' || typeof rawAmount === 'number' ? String(rawAmount) : '';
  const amount = Number(amountText);
  if (!amountText || !Number.isFinite(amount) || !/^\d+(?:\.\d{1,2})?$/.test(amountText)) {
    throw { status: 400, message: 'PayPal capture amount is invalid' };
  }
  if (capture.amount.currency_code !== payment.currency) {
    throw { status: 400, message: 'PayPal capture currency mismatch' };
  }
  if (Math.round(amount * 100) !== Math.round(payment.amount * 100)) {
    throw { status: 400, message: 'PayPal capture amount mismatch' };
  }

  return capture.id.trim();
}

async function markPaymentFailed(payment) {
  await Payment.updateOne(
    { _id: payment._id, status: { $ne: 'CAPTURED' } },
    { $set: { status: 'FAILED' } }
  );
}

function emitCapturedOrder(order) {
  try {
    const io = socket.getIO();
    const opsSummary = {
      _id: order._id,
      status: order.status,
      total: order.total,
      createdAt: order.createdAt,
      items: order.items.map((item) => ({ title: item.title, quantity: item.quantity })),
    };
    io.to('ops').emit('order:created', opsSummary);
    io.to(`user:${order.userId}`).emit('order:updated', order);
  } catch {
    // Socket.IO may not be initialized in scripts or tests.
  }
}

async function persistVerifiedCapture(order, payment, captureId) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      const currentPayment = await Payment.findById(payment._id).session(session);
      if (!currentPayment) throw { status: 404, message: 'Payment not found' };
      if (currentPayment.status === 'CAPTURED') {
        const currentOrder = await Order.findById(order._id).session(session);
        result = { payment: currentPayment, order: currentOrder, alreadyCaptured: true };
        return;
      }

      const currentOrder = await Order.findById(order._id).session(session);
      if (!currentOrder) throw { status: 404, message: 'Order not found' };
      if (!isPendingPayment(currentOrder)) {
        throw { status: 409, message: 'Order is not awaiting payment' };
      }

      const updatedPayment = await Payment.findOneAndUpdate(
        { _id: payment._id, status: { $ne: 'CAPTURED' } },
        { $set: { status: 'CAPTURED', captureId } },
        { new: true, session }
      );
      if (!updatedPayment) {
        const winningPayment = await Payment.findById(payment._id).session(session);
        if (!winningPayment) throw { status: 404, message: 'Payment not found' };
        if (winningPayment.status !== 'CAPTURED') {
          throw { status: 409, message: 'Payment changed while capture was being saved' };
        }
        const winningOrder = await Order.findById(order._id).session(session);
        result = { payment: winningPayment, order: winningOrder, alreadyCaptured: true };
        return;
      }

      const updatedOrder = await Order.findOneAndUpdate(
        { _id: order._id, status: 'PENDING_PAYMENT', paymentStatus: 'UNPAID' },
        { $set: { status: 'PAID', paymentStatus: 'PAID' } },
        { new: true, session }
      );
      if (!updatedOrder) throw { status: 409, message: 'Order changed while payment was being captured' };
      result = { payment: updatedPayment, order: updatedOrder, alreadyCaptured: false };
    });
    return result;
  } finally {
    await session.endSession();
  }
}

function existingPaymentResponse(payment, paypalOrder) {
  const payload = { payment, providerOrderId: payment.providerOrderId };
  if (payment.status === 'CAPTURED') payload.alreadyCaptured = true;
  if (paypalOrder) payload.paypalOrder = paypalOrder;
  return payload;
}

async function createPaypalOrder(req, res, next) {
  try {
    if (!isValidObjectId(req.params.orderId)) {
      return next({ status: 400, message: 'Invalid order ID' });
    }
    const order = await Order.findById(req.params.orderId);
    if (!order) return next({ status: 404, message: 'Order not found' });
    if (!isOwner(order, req.user)) return next({ status: 403, message: 'Forbidden' });
    if (!isPendingPayment(order)) {
      return next({ status: 409, message: 'Order is not awaiting payment' });
    }

    const existing = await findPayment(order._id);
    if (existing) {
      if (existing.status === 'CAPTURED') {
        return res.json(existingPaymentResponse(existing));
      }
      // Never replace a provider order after a capture attempt. Reusing it is
      // what makes lost-response retries safe instead of creating a second charge.
      if (existing.status === 'FAILED' || existing.status === 'CANCELLED') {
        const reused = await Payment.findOneAndUpdate(
          { _id: existing._id, status: { $nin: ['CAPTURED'] } },
          { $set: { status: 'CREATED' } },
          { new: true }
        );
        if (reused) return res.json(existingPaymentResponse(reused));
        const current = await findPayment(order._id);
        if (!current) throw { status: 404, message: 'Payment not found' };
        return res.json(existingPaymentResponse(current));
      }
      return res.json(existingPaymentResponse(existing));
    }

    const paypalOrder = await paypalCreate(order.total, 'USD', order._id.toString());
    if (typeof paypalOrder.id !== 'string' || !paypalOrder.id.trim()) {
      return next({ status: 502, message: 'PayPal did not return a provider order ID' });
    }

    // The order may have been cancelled or paid while PayPal was creating it.
    const latestOrder = await Order.findById(order._id);
    if (!latestOrder) return next({ status: 404, message: 'Order not found' });
    if (!isPendingPayment(latestOrder)) {
      return next({ status: 409, message: 'Order is not awaiting payment' });
    }

    let payment;
    try {
      payment = await Payment.create({
        orderId: order._id,
        providerOrderId: paypalOrder.id,
        amount: order.total,
        currency: 'USD',
        status: 'CREATED',
      });
    } catch (err) {
      if (err.code !== 11000) throw err;
      const winningPayment = await findPayment(order._id);
      if (!winningPayment) throw err;
      return res.json(existingPaymentResponse(winningPayment));
    }

    return res.status(201).json(existingPaymentResponse(payment, paypalOrder));
  } catch (err) {
    if (err instanceof PayPalApiError) {
      return next({ status: 502, message: 'PayPal order creation failed' });
    }
    return next(err);
  }
}

async function capture(req, res, next) {
  try {
    if (!isValidObjectId(req.params.orderId)) {
      return next({ status: 400, message: 'Invalid order ID' });
    }
    const order = await Order.findById(req.params.orderId);
    if (!order) return next({ status: 404, message: 'Order not found' });
    if (!isOwner(order, req.user)) return next({ status: 403, message: 'Forbidden' });

    const payment = await findPayment(order._id);
    if (!payment) return next({ status: 404, message: 'Payment not found' });
    if (req.body?.providerOrderId && req.body.providerOrderId !== payment.providerOrderId) {
      return next({ status: 400, message: 'providerOrderId mismatch' });
    }

    // A completed payment is a terminal replay. Do not regress PAID, PREPARING,
    // SHIPPED, or DELIVERED back to PAID.
    if (payment.status === 'CAPTURED') {
      return res.json({ payment, order, alreadyCaptured: true });
    }
    if (!isPendingPayment(order)) {
      return next({ status: 409, message: 'Order is not awaiting payment' });
    }

    let captureResponse;
    try {
      captureResponse = await paypalCapture(payment.providerOrderId);
    } catch {
      try {
        captureResponse = await paypalGetOrderDetails(payment.providerOrderId);
      } catch {
        return next({ status: 502, message: 'PayPal capture could not be verified' });
      }
    }

    let captureId;
    try {
      captureId = verifyCapture(captureResponse, payment, order);
    } catch (verificationError) {
      await markPaymentFailed(payment);
      return next(verificationError);
    }

    const result = await persistVerifiedCapture(order, payment, captureId);
    if (!result.alreadyCaptured) emitCapturedOrder(result.order);
    return res.json(result);
  } catch (err) {
    return next(err);
  }
}

module.exports = { createPaypalOrder, capture, verifyCapture };
