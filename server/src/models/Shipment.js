const mongoose = require('mongoose');

const shipmentSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, unique: true, index: true },
    address: { type: String, required: true },
    carrier: { type: String, trim: true, maxlength: 100 },
    trackingCode: { type: String, trim: true, maxlength: 120 },
    status: {
      type: String,
      enum: ['PENDING', 'PREPARING', 'SHIPPED', 'DELIVERED'],
      default: 'PENDING',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Shipment', shipmentSchema);