const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    author: { type: String, required: true, trim: true },
    isbn: { type: String, trim: true },
    category: { type: String, trim: true, index: true },
    price: { type: Number, required: true, min: [0.01, 'Price must be > 0'] },
    stock: { type: Number, required: true, min: [0, 'Stock cannot be negative'], default: 0 },
    coverUrl: { type: String, trim: true },
    available: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Book', bookSchema);