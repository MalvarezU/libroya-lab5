const assert = require('node:assert/strict');
const { once } = require('node:events');
const { afterEach, beforeEach, mock, test } = require('node:test');
const express = require('express');
const jwt = require('jsonwebtoken');

function stubModule(modulePath, exports) {
  const id = require.resolve(modulePath);
  require.cache[id] = { id, filename: id, loaded: true, exports };
}

const JWT_SECRET = 'test-secret-for-download-endpoint';
const BOOK_ID = '507f1f77bcf86cd799439021';
const USER_ID = '507f1f77bcf86cd799439031';
const OTHER_USER_ID = '507f1f77bcf86cd799439041';
const books = new Map();
const orders = [];

const Book = { findById: mock.fn() };
const Order = { findOne: mock.fn() };

function matchesQuery(order, query) {
  if (query.userId && order.userId !== query.userId) return false;
  if (query.paymentStatus && order.paymentStatus !== query.paymentStatus) return false;
  if (query.status?.$in && !query.status.$in.includes(order.status)) return false;
  if (query['items.bookId']) {
    return order.items.some((item) => item.bookId === query['items.bookId']);
  }
  return true;
}

stubModule('../src/config/env', { jwtSecret: JWT_SECRET, nodeEnv: 'test' });
stubModule('../src/models/Book', Book);
stubModule('../src/models/Order', Order);

const errorHandler = require('../src/middleware/errorHandler');
const bookRoutes = require('../src/routes/books');
const app = express();
app.use('/api/books', bookRoutes);
app.use(errorHandler);

let server;
let baseUrl;

function createOrder(overrides = {}) {
  return {
    _id: '507f1f77bcf86cd799439051',
    userId: USER_ID,
    items: [{ bookId: BOOK_ID, title: 'Demo title', price: 10, quantity: 1 }],
    address: 'Calle Falsa 123',
    total: 10,
    status: 'PAID',
    paymentStatus: 'PAID',
    ...overrides,
  };
}

function tokenFor(userId = USER_ID) {
  return jwt.sign({ id: userId, role: 'cliente' }, JWT_SECRET, { expiresIn: '1h' });
}

async function download(bookId = BOOK_ID, token = tokenFor()) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  return fetch(`${baseUrl}/api/books/${encodeURIComponent(bookId)}/download`, { headers });
}

beforeEach(async () => {
  books.clear();
  orders.length = 0;
  books.set(BOOK_ID, {
    _id: BOOK_ID,
    title: 'El camino del conocimiento',
    author: 'Ana Autora',
  });
  orders.push(createOrder());

  Book.findById.mock.resetCalls();
  Order.findOne.mock.resetCalls();
  Book.findById.mock.mockImplementation(async (id) => books.get(id) || null);
  Order.findOne.mock.mockImplementation(async (query) => (
    orders.find((order) => matchesQuery(order, query)) || null
  ));

  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterEach(async () => {
  await new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

test('download requires authentication', async () => {
  const response = await download(BOOK_ID, null);

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: 'Authentication required' });
  assert.equal(Order.findOne.mock.callCount(), 0);
  assert.equal(Book.findById.mock.callCount(), 0);
});

for (const status of ['PAID', 'PREPARING', 'SHIPPED', 'DELIVERED']) {
  test(`download allows the paying owner when the order is ${status}`, async () => {
    orders[0].status = status;

    const response = await download();

    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /^text\/plain; charset=utf-8/);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    assert.equal(response.headers.get('access-control-expose-headers'), 'Content-Disposition');
    const body = await response.text();
    assert.match(body, /Title: El camino del conocimiento/);
    assert.match(body, /Author: Ana Autora/);
    assert.match(body, /DEMO NOTICE/);
    assert.match(body, /No commercial book file was supplied/);
    assert.deepEqual(Order.findOne.mock.calls[0].arguments[0], {
      userId: USER_ID,
      'items.bookId': BOOK_ID,
      paymentStatus: 'PAID',
      status: { $in: ['PAID', 'PREPARING', 'SHIPPED', 'DELIVERED'] },
    });
  });
}

test('download denies an order with paymentStatus UNPAID', async () => {
  orders[0].paymentStatus = 'UNPAID';

  const response = await download();

  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { error: 'Forbidden' });
  assert.equal(Book.findById.mock.callCount(), 0);
});

test('download denies a cancelled order even if paymentStatus is PAID', async () => {
  orders[0].status = 'CANCELLED';

  const response = await download();

  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { error: 'Forbidden' });
  assert.equal(Book.findById.mock.callCount(), 0);
});

test('download denies a different user without loading the book', async () => {
  const response = await download(BOOK_ID, tokenFor(OTHER_USER_ID));

  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { error: 'Forbidden' });
  assert.equal(Order.findOne.mock.calls[0].arguments[0].userId, OTHER_USER_ID);
  assert.equal(Book.findById.mock.callCount(), 0);
});

test('download rejects an invalid ObjectId before querying the database', async () => {
  const response = await download('not-an-object-id');

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'Invalid book ID' });
  assert.equal(Order.findOne.mock.callCount(), 0);
  assert.equal(Book.findById.mock.callCount(), 0);
});

test('download uses a safe attachment filename and generated demo content', async () => {
  books.set(BOOK_ID, {
    _id: BOOK_ID,
    title: '../../El niño / especial\r\n',
    author: 'Ana/ría',
  });

  const response = await download();

  assert.equal(response.status, 200);
  assert.equal(
    response.headers.get('content-disposition'),
    'attachment; filename="el-nino-especial-demo-edition.txt"'
  );
  assert.equal(response.headers.get('x-injected'), null);
  const body = await response.text();
  assert.match(body, /Title: \.\.\/\.\.\/El niño \/ especial/);
  assert.match(body, /Author: Ana\/ría/);
  assert.doesNotMatch(body, /\r/);
});

test('download returns 404 when an entitled book no longer exists', async () => {
  books.delete(BOOK_ID);

  const response = await download();

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: 'Book not found' });
});
