const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
    title: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1, max: 100 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items: { type: [orderItemSchema], required: true },
    address: { type: String, required: true, trim: true, maxlength: 500 },
    total: { type: Number, required: true, min: 0 },
    checkoutKey: {
      type: String,
      trim: true,
      maxlength: 128,
      match: /^[A-Za-z0-9._:-]+$/,
    },
    checkoutHash: { type: String, match: /^[a-f0-9]{64}$/ },
    status: {
      type: String,
      enum: ['PENDING_PAYMENT', 'PAID', 'PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
      default: 'PENDING_PAYMENT',
    },
    paymentStatus: { type: String, enum: ['UNPAID', 'PAID'], default: 'UNPAID' },
  },
  { timestamps: true }
);

orderSchema.index({ userId: 1, checkoutKey: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Order', orderSchema);