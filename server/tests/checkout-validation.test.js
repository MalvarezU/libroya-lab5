const assert = require('node:assert/strict');
const { test } = require('node:test');

function stubModule(modulePath, exports) {
  const id = require.resolve(modulePath);
  require.cache[id] = { id, filename: id, loaded: true, exports };
}

stubModule('../src/controllers/orderController', {
  create: (_req, res) => res.json({}),
  listMine: (_req, res) => res.json([]),
  listAll: (_req, res) => res.json([]),
  getById: (_req, res) => res.json({}),
  updateStatus: (_req, res) => res.json({}),
  cancel: (_req, res) => res.json({}),
});
stubModule('../src/middleware/auth', {
  authenticate: (_req, _res, next) => next(),
  authorize: () => (_req, _res, next) => next(),
});

const { createOrderSchema, updateStatusSchema } = require('../src/routes/orders');

const BOOK_ID = '507f1f77bcf86cd799439021';

test('checkout schema rejects malformed book ObjectIds', () => {
  const result = createOrderSchema.safeParse({
    items: [{ bookId: 'not-an-object-id', quantity: 1 }],
    address: 'Calle 123',
  });
  assert.equal(result.success, false);
});

test('checkout schema accepts a valid ObjectId', () => {
  const result = createOrderSchema.safeParse({
    items: [{ bookId: BOOK_ID, quantity: 1 }],
    address: 'Calle 123',
  });
  assert.equal(result.success, true);
});

test('checkout schema caps quantity at 100', () => {
  assert.equal(createOrderSchema.safeParse({
    items: [{ bookId: BOOK_ID, quantity: 101 }],
    address: 'Calle 123',
  }).success, false);
});

test('checkout schema trims the address and rejects blank addresses', () => {
  const parsed = createOrderSchema.parse({
    items: [{ bookId: BOOK_ID, quantity: 1 }],
    address: '  Calle 123  ',
  });
  assert.equal(parsed.address, 'Calle 123');
  assert.equal(createOrderSchema.safeParse({
    items: [{ bookId: BOOK_ID, quantity: 1 }],
    address: '   ',
  }).success, false);
});

test('checkout schema caps address length at 500 characters', () => {
  assert.equal(createOrderSchema.safeParse({
    items: [{ bookId: BOOK_ID, quantity: 1 }],
    address: 'a'.repeat(501),
  }).success, false);
});

test('shipment status schema caps carrier and tracking code lengths', () => {
  assert.equal(updateStatusSchema.safeParse({
    status: 'SHIPPED',
    carrier: 'a'.repeat(101),
    trackingCode: 'TRK-1',
  }).success, false);
  assert.equal(updateStatusSchema.safeParse({
    status: 'SHIPPED',
    carrier: 'Correos',
    trackingCode: 'a'.repeat(121),
  }).success, false);
});
