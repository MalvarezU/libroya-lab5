const Book = require('../models/Book');
const Order = require('../models/Order');
const { isValidObjectId } = require('../utils/objectId');
const {
  DOWNLOADABLE_ORDER_STATUSES,
  createDemoEdition,
  createDownloadFilename,
} = require('../services/demoEdition');

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

async function download(req, res, next) {
  const bookId = req.params.id;
  if (!isValidObjectId(bookId)) {
    return next({ status: 400, message: 'Invalid book ID' });
  }

  try {
    const entitlement = await Order.findOne({
      userId: req.user.id,
      'items.bookId': bookId,
      paymentStatus: 'PAID',
      status: { $in: DOWNLOADABLE_ORDER_STATUSES },
    });
    if (!entitlement) return next({ status: 403, message: 'Forbidden' });

    const book = await Book.findById(bookId);
    if (!book) return next({ status: 404, message: 'Book not found' });

    res.attachment(createDownloadFilename(book.title));
    res.type('text/plain; charset=utf-8');
    res.set('Cache-Control', 'private, no-store');
    res.set('Access-Control-Expose-Headers', 'Content-Disposition');
    return res.send(createDemoEdition(book));
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

module.exports = { list, getOne, download, create, update, remove };