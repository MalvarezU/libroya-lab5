const Order = require('../models/Order');
const Payment = require('../models/Payment');
const { createOrder: paypalCreate, captureOrder: paypalCapture } = require('../utils/paypal');
const socket = require('../socket');

function isOwnerOrOp(order, user) {
  return order.userId.toString() === user.id || user.role === 'operador';
}

async function createPaypalOrder(req, res, next) {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) return next({ status: 404, message: 'Order not found' });
    if (!isOwnerOrOp(order, req.user)) return next({ status: 403, message: 'Forbidden' });

    // Idempotent: if already captured, return existing.
    const existing = await Payment.findOne({ orderId: order._id }).sort({ createdAt: -1 });
    if (existing && existing.status === 'CAPTURED') {
      return res.json({ payment: existing, alreadyCaptured: true });
    }

    // Reuse an in-flight payment if present.
    if (existing && (existing.status === 'CREATED' || existing.status === 'APPROVED')) {
      return res.json({ payment: existing, providerOrderId: existing.providerOrderId });
    }

    const paypalOrder = await paypalCreate(order.total, 'USD', order._id.toString());
    const payment = await Payment.create({
      orderId: order._id,
      providerOrderId: paypalOrder.id,
      amount: order.total,
      currency: 'USD',
      status: 'CREATED',
    });

    return res.status(201).json({ payment, paypalOrder });
  } catch (err) {
    return next(err);
  }
}

async function capture(req, res, next) {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) return next({ status: 404, message: 'Order not found' });
    if (!isOwnerOrOp(order, req.user)) return next({ status: 403, message: 'Forbidden' });

    const payment = await Payment.findOne({ orderId: order._id }).sort({ createdAt: -1 });
    if (!payment) return next({ status: 404, message: 'Payment not found' });

    // providerOrderId match check
    if (req.body && req.body.providerOrderId && req.body.providerOrderId !== payment.providerOrderId) {
      return next({ status: 400, message: 'providerOrderId mismatch' });
    }

    // Idempotent on repeat.
    if (payment.status === 'CAPTURED') {
      if (order.status !== 'PAID') {
        order.status = 'PAID';
        order.paymentStatus = 'PAID';
        await order.save();
      }
      return res.json({ payment, order, alreadyCaptured: true });
    }

    const captureRes = await paypalCapture(payment.providerOrderId);

    // Verify capture status.
    const pu = (captureRes.purchase_units || [])[0] || {};
    const captures = (pu.payments && pu.payments.captures) || [];
    const cap = captures[0] || {};
    const captureStatus = cap.status || captureRes.status;
    if (captureStatus !== 'COMPLETED') {
      payment.status = 'FAILED';
      await payment.save();
      return next({ status: 400, message: `Payment not completed: ${captureStatus}` });
    }

    // Verify amount and currency.
    const capAmount = cap.amount || {};
    const capValue = Number(capAmount.value);
    const capCurrency = capAmount.currency_code;
    if (capCurrency !== payment.currency || Math.abs(capValue - payment.amount) > 0.001) {
      payment.status = 'FAILED';
      await payment.save();
      return next({ status: 400, message: 'Amount or currency mismatch' });
    }

    payment.status = 'CAPTURED';
    payment.captureId = cap.id;
    await payment.save();

    order.status = 'PAID';
    order.paymentStatus = 'PAID';
    await order.save();

    // Emit socket events.
    try {
      const opsSummary = {
        _id: order._id,
        status: order.status,
        total: order.total,
        createdAt: order.createdAt,
        items: order.items.map((i) => ({ title: i.title, quantity: i.quantity })),
      };
      socket.getIO().to('ops').emit('order:created', opsSummary);
      socket.getIO().to(`user:${order.userId}`).emit('order:updated', order);
    } catch (e) {
      // socket not available; ignore
    }

    return res.json({ payment, order });
  } catch (err) {
    return next(err);
  }
}

module.exports = { createPaypalOrder, capture };