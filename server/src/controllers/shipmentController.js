const mongoose = require('mongoose');
const Order = require('../models/Order');
const Shipment = require('../models/Shipment');

async function getByOrderId(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.orderId)) {
      return next({ status: 400, message: 'Invalid order ID' });
    }

    const order = await Order.findById(req.params.orderId).select('userId');
    if (!order) return next({ status: 404, message: 'Order not found' });

    const isOwner = order.userId.toString() === req.user.id;
    const isOp = req.user.role === 'operador';
    if (!isOwner && !isOp) return next({ status: 403, message: 'Forbidden' });

    const shipment = await Shipment.findOne({ orderId: order._id });
    if (!shipment) return next({ status: 404, message: 'Shipment not found' });
    return res.json(shipment);
  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.orderId)) {
      return next({ status: 400, message: 'Invalid order ID' });
    }

    const { carrier, trackingCode } = req.body;
    const shipment = await Shipment.findOneAndUpdate(
      { orderId: req.params.orderId },
      { $set: { carrier, trackingCode } },
      { new: true, runValidators: true }
    );
    if (!shipment) return next({ status: 404, message: 'Shipment not found' });
    return res.json(shipment);
  } catch (err) {
    return next(err);
  }
}

module.exports = { getByOrderId, update };
