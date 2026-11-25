const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { beforeEach, test, mock } = require('node:test');

function stubModule(modulePath, exports) {
  const id = require.resolve(modulePath);
  require.cache[id] = { id, filename: id, loaded: true, exports };
}

function queryResult(value) {
  return {
    session: () => Promise.resolve(value),
    sort() {
      return this;
    },
    then(resolve, reject) {
      return Promise.resolve(value).then(resolve, reject);
    },
  };
}

const session = {
  withTransaction: mock.fn(async (callback) => callback()),
  endSession: mock.fn(async () => {}),
};
const mongoose = {
  startSession: mock.fn(async () => session),
  isValidObjectId: (value) => /^[0-9a-f]{24}$/i.test(value),
};
const Book = {
  findOneAndUpdate: mock.fn(),
  findById: mock.fn(),
  findByIdAndUpdate: mock.fn(),
};
const Order = {
  findOne: mock.fn(),
  create: mock.fn(),
  findById: mock.fn(),
  findOneAndUpdate: mock.fn(),
};
const Payment = {
  findOne: mock.fn(),
  updateOne: mock.fn(),
};
const socket = {
  emitOrderStatusChanged: mock.fn(),
  emitOrderUpdated: mock.fn(),
};

stubModule('mongoose', mongoose);
stubModule('../src/models/Book', Book);
stubModule('../src/models/Order', Order);
stubModule('../src/models/Payment', Payment);
stubModule('../src/models/Shipment', {});
stubModule('../src/socket', socket);

const orderController = require('../src/controllers/orderController');

const USER_ID = '507f1f77bcf86cd799439011';
const OTHER_USER_ID = '507f1f77bcf86cd799439012';
const BOOK_ID = '507f1f77bcf86cd799439021';
const SECOND_BOOK_ID = '507f1f77bcf86cd799439022';
const ORDER_ID = '507f1f77bcf86cd799439031';
const CHECKOUT_KEY = 'checkout-key-123456';

function checkoutHash(items, address) {
  const quantities = new Map();
  for (const item of items) {
    quantities.set(item.bookId, (quantities.get(item.bookId) || 0) + item.quantity);
  }
  const canonicalItems = [...quantities]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([bookId, quantity]) => ({ bookId, quantity }));
  return crypto.createHash('sha256').update(JSON.stringify({ address, items: canonicalItems })).digest('hex');
}

function createResponse() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

function createRequest(overrides = {}) {
  return {
    user: { id: USER_ID, role: 'cliente' },
    idempotencyKey: CHECKOUT_KEY,
    body: { items: [{ bookId: BOOK_ID, quantity: 2 }], address: 'Calle 123' },
    ...overrides,
  };
}

function pendingOrder(overrides = {}) {
  return {
    _id: ORDER_ID,
    userId: USER_ID,
    address: 'Calle 123',
    status: 'PENDING_PAYMENT',
    paymentStatus: 'UNPAID',
    items: [
      { bookId: BOOK_ID, quantity: 2 },
      { bookId: SECOND_BOOK_ID, quantity: 1 },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  for (const fn of [
    Book.findOneAndUpdate,
    Book.findById,
    Book.findByIdAndUpdate,
    Order.findOne,
    Order.create,
    Order.findById,
    Order.findOneAndUpdate,
    Payment.findOne,
    Payment.updateOne,
    socket.emitOrderStatusChanged,
    socket.emitOrderUpdated,
    session.withTransaction,
    session.endSession,
    mongoose.startSession,
  ]) {
    fn.mock.resetCalls();
  }

  session.withTransaction.mock.mockImplementation(async (callback) => callback());
  session.endSession.mock.mockImplementation(async () => {});
  mongoose.startSession.mock.mockImplementation(async () => session);
  Order.findOne.mock.mockImplementation(() => queryResult(null));
  Order.create.mock.mockImplementation(async (docs) => docs.map((doc) => ({ _id: ORDER_ID, ...doc })));
  Order.findById.mock.mockImplementation(() => queryResult(null));
  Order.findOneAndUpdate.mock.mockImplementation(async (filter, update) => ({
    _id: filter._id,
    ...update.$set,
  }));
  Book.findById.mock.mockImplementation(async () => null);
  Book.findByIdAndUpdate.mock.mockImplementation(async (_id) => ({ _id }));
  Payment.findOne.mock.mockImplementation(() => queryResult(null));
  Payment.updateOne.mock.mockImplementation(async () => ({ modifiedCount: 1 }));
});

test('checkout replay with the same key and hash returns the existing order without reserving stock again', async () => {
  const req = createRequest();
  const existing = {
    _id: ORDER_ID,
    userId: USER_ID,
    checkoutKey: CHECKOUT_KEY,
    checkoutHash: checkoutHash(req.body.items, req.body.address),
  };
  Order.findOne.mock.mockImplementation(() => queryResult(existing));
  const res = createResponse();
  const next = mock.fn();

  await orderController.create(req, res, next);

  assert.equal(next.mock.callCount(), 0);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body, existing);
  assert.equal(Book.findOneAndUpdate.mock.callCount(), 0);
  assert.equal(Order.create.mock.callCount(), 0);
});

test('checkout key reuse with a different cart or address hash returns 409 without reserving stock', async () => {
  const req = createRequest();
  Order.findOne.mock.mockImplementation(() => queryResult({
    _id: ORDER_ID,
    userId: USER_ID,
    checkoutKey: CHECKOUT_KEY,
    checkoutHash: 'different-hash',
  }));
  const res = createResponse();
  const next = mock.fn();

  await orderController.create(req, res, next);

  assert.equal(next.mock.callCount(), 1);
  assert.equal(next.mock.calls[0].arguments[0].status, 409);
  assert.equal(Book.findOneAndUpdate.mock.callCount(), 0);
  assert.equal(Order.create.mock.callCount(), 0);
});

test('new checkout stores the key and canonical hash while reserving stock atomically', async () => {
  const req = createRequest({
    body: {
      items: [
        { bookId: BOOK_ID, quantity: 1 },
        { bookId: BOOK_ID, quantity: 1 },
      ],
      address: '  Calle 123  ',
    },
  });
  req.body.address = req.body.address.trim();
  Book.findOneAndUpdate.mock.mockImplementation(async () => ({
    _id: BOOK_ID,
    title: 'Book',
    price: 12.5,
  }));
  const res = createResponse();
  const next = mock.fn();

  await orderController.create(req, res, next);

  assert.equal(next.mock.callCount(), 0);
  assert.equal(res.statusCode, 201);
  assert.equal(Book.findOneAndUpdate.mock.callCount(), 1);
  assert.equal(Book.findOneAndUpdate.mock.calls[0].arguments[1].$inc.stock, -2);
  const created = Order.create.mock.calls[0].arguments[0][0];
  assert.equal(created.checkoutKey, CHECKOUT_KEY);
  assert.equal(created.checkoutHash, checkoutHash(req.body.items, req.body.address));
  assert.equal(created.items[0].quantity, 2);
  assert.equal(created.total, 25);
});

test('duplicate-key race re-reads and returns the winning order for the same hash', async () => {
  const req = createRequest();
  const existing = {
    _id: ORDER_ID,
    userId: USER_ID,
    checkoutKey: CHECKOUT_KEY,
    checkoutHash: checkoutHash(req.body.items, req.body.address),
  };
  let reads = 0;
  Order.findOne.mock.mockImplementation(() => queryResult(++reads === 1 ? null : existing));
  Book.findOneAndUpdate.mock.mockImplementation(async () => ({ _id: BOOK_ID, title: 'Book', price: 10 }));
  Order.create.mock.mockImplementation(async () => {
    throw Object.assign(new Error('duplicate key'), { code: 11000 });
  });
  const res = createResponse();
  const next = mock.fn();

  await orderController.create(req, res, next);

  assert.equal(next.mock.callCount(), 0);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body, existing);
  assert.equal(Order.findOne.mock.callCount(), 2);
});

test('duplicate-key race re-reads and conflicts when the winning hash differs', async () => {
  const req = createRequest();
  let reads = 0;
  Order.findOne.mock.mockImplementation(() => queryResult(++reads === 1 ? null : {
    _id: ORDER_ID,
    userId: USER_ID,
    checkoutKey: CHECKOUT_KEY,
    checkoutHash: 'different-hash',
  }));
  Book.findOneAndUpdate.mock.mockImplementation(async () => ({ _id: BOOK_ID, title: 'Book', price: 10 }));
  Order.create.mock.mockImplementation(async () => {
    throw Object.assign(new Error('duplicate key'), { code: 11000 });
  });
  const res = createResponse();
  const next = mock.fn();

  await orderController.create(req, res, next);

  assert.equal(next.mock.calls[0].arguments[0].status, 409);
  assert.equal(Order.findOne.mock.callCount(), 2);
});

test('owner cancellation restores every item and cancels the order and latest payment in one transaction', async () => {
  const order = pendingOrder();
  const payment = { _id: 'payment-1', orderId: ORDER_ID, status: 'CREATED' };
  Order.findById.mock.mockImplementation(() => queryResult(order));
  Payment.findOne.mock.mockImplementation(() => queryResult(payment));
  Order.findOneAndUpdate.mock.mockImplementation(async () => ({ ...order, status: 'CANCELLED' }));
  const req = { params: { id: ORDER_ID }, user: { id: USER_ID, role: 'cliente' } };
  const res = createResponse();
  const next = mock.fn();

  await orderController.cancel(req, res, next);

  assert.equal(next.mock.callCount(), 0);
  assert.equal(session.withTransaction.mock.callCount(), 1);
  assert.equal(Book.findByIdAndUpdate.mock.callCount(), 2);
  assert.deepEqual(Book.findByIdAndUpdate.mock.calls[0].arguments[1], { $inc: { stock: 2 } });
  assert.deepEqual(Book.findByIdAndUpdate.mock.calls[1].arguments[1], { $inc: { stock: 1 } });
  assert.deepEqual(Order.findOneAndUpdate.mock.calls[0].arguments[1], { $set: { status: 'CANCELLED' } });
  assert.deepEqual(Payment.updateOne.mock.calls[0].arguments[1], { $set: { status: 'CANCELLED' } });
  assert.equal(res.body.status, 'CANCELLED');
  assert.equal(socket.emitOrderStatusChanged.mock.calls[0].arguments[0], res.body);
  assert.equal(socket.emitOrderUpdated.mock.calls[0].arguments[0], res.body);
  assert.equal(session.endSession.mock.callCount(), 1);
});

test('cancellation rejects a different owner before touching stock', async () => {
  Order.findById.mock.mockImplementation(() => queryResult(pendingOrder()));
  const req = { params: { id: ORDER_ID }, user: { id: OTHER_USER_ID, role: 'cliente' } };
  const next = mock.fn();

  await orderController.cancel(req, createResponse(), next);

  assert.equal(next.mock.calls[0].arguments[0].status, 403);
  assert.equal(Book.findByIdAndUpdate.mock.callCount(), 0);
  assert.equal(Order.findOneAndUpdate.mock.callCount(), 0);
});

test('cancellation rejects orders that are not pending payment', async () => {
  Order.findById.mock.mockImplementation(() => queryResult(pendingOrder({ status: 'PAID' })));
  const req = { params: { id: ORDER_ID }, user: { id: USER_ID, role: 'cliente' } };
  const next = mock.fn();

  await orderController.cancel(req, createResponse(), next);

  assert.equal(next.mock.calls[0].arguments[0].status, 409);
  assert.equal(Book.findByIdAndUpdate.mock.callCount(), 0);
});

test('cancellation does not release stock for a captured payment', async () => {
  Order.findById.mock.mockImplementation(() => queryResult(pendingOrder()));
  Payment.findOne.mock.mockImplementation(() => queryResult({ status: 'CAPTURED' }));
  const req = { params: { id: ORDER_ID }, user: { id: USER_ID, role: 'cliente' } };
  const next = mock.fn();

  await orderController.cancel(req, createResponse(), next);

  assert.equal(next.mock.calls[0].arguments[0].status, 409);
  assert.equal(Book.findByIdAndUpdate.mock.callCount(), 0);
});

test('cancellation rejects malformed order identifiers before opening a transaction', async () => {
  const req = { params: { id: 'not-an-object-id' }, user: { id: USER_ID, role: 'cliente' } };
  const next = mock.fn();

  await orderController.cancel(req, createResponse(), next);

  assert.equal(next.mock.calls[0].arguments[0].status, 400);
  assert.equal(mongoose.startSession.mock.callCount(), 0);
});
