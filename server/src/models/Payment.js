const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, unique: true },
    provider: { type: String, default: 'paypal' },
    providerOrderId: { type: String, required: true, trim: true, maxlength: 128 },
    captureId: { type: String, trim: true, maxlength: 128 },
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

paymentSchema.index({ providerOrderId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Payment', paymentSchema);