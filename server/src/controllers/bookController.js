const Book = require('../models/Book');

async function list(req, res, next) {
  try {
    const filter = {};
    if (req.query.category) filter.category = req.query.category;
    const books = await Book.find(filter).sort({ createdAt: -1 });
    return res.json(books);
  } catch (err) {
    return next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return next({ status: 404, message: 'Book not found' });
    return res.json(book);
  } catch (err) {
    return next(err);
  }
}

async function create(req, res, next) {
  try {
    const book = await Book.create(req.body);
    return res.status(201).json(book);
  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    const book = await Book.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!book) return next({ status: 404, message: 'Book not found' });
    return res.json(book);
  } catch (err) {
    return next(err);
  }
}

async function remove(req, res, next) {
  try {
    const book = await Book.findByIdAndDelete(req.params.id);
    if (!book) return next({ status: 404, message: 'Book not found' });
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

module.exports = { list, getOne, create, update, remove };