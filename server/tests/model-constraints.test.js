const assert = require('node:assert/strict');
const { test } = require('node:test');
const Order = require('../src/models/Order');
const Payment = require('../src/models/Payment');

function hasIndex(model, keys, options) {
  return model.schema.indexes().some(([indexKeys, indexOptions]) => {
    return JSON.stringify(indexKeys) === JSON.stringify(keys)
      && Object.entries(options).every(([key, value]) => indexOptions[key] === value);
  });
}

test('Order supports CANCELLED and checkout idempotency fields', () => {
  assert.equal(Order.schema.path('status').enumValues.includes('CANCELLED'), true);
  assert.equal(Order.schema.path('checkoutKey').instance, 'String');
  assert.equal(Order.schema.path('checkoutHash').instance, 'String');
});

test('Order enforces a unique sparse userId plus checkoutKey index', () => {
  assert.equal(hasIndex(Order, { userId: 1, checkoutKey: 1 }, { unique: true, sparse: true }), true);
});

test('Payment enforces one document per order and provider order', () => {
  assert.equal(hasIndex(Payment, { orderId: 1 }, { unique: true }), true);
  assert.equal(hasIndex(Payment, { providerOrderId: 1 }, { unique: true, sparse: true }), true);
});
