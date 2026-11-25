const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    provider: { type: String, default: 'paypal' },
    providerOrderId: { type: String, required: true },
    captureId: { type: String },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    status: {
      type: String,
      enum: ['CREATED', 'APPROVED', 'CAPTURED', 'FAILED', 'CANCELLED'],
      default: 'CREATED',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);