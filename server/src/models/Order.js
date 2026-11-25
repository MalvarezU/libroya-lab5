const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
    title: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items: { type: [orderItemSchema], required: true },
    address: { type: String, required: true },
    total: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['PENDING_PAYMENT', 'PAID', 'PREPARING', 'SHIPPED', 'DELIVERED'],
      default: 'PENDING_PAYMENT',
    },
    paymentStatus: { type: String, enum: ['UNPAID', 'PAID'], default: 'UNPAID' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);