const assert = require('node:assert/strict');
const { beforeEach, test, mock } = require('node:test');

function stubModule(modulePath, exports) {
  const id = require.resolve(modulePath);
  require.cache[id] = { id, filename: id, loaded: true, exports };
}

stubModule('../src/config/env', {
  paypal: {
    clientId: 'test-client',
    clientSecret: 'test-secret',
    apiBase: 'https://paypal.invalid',
  },
});

const paypal = require('../src/utils/paypal');
const originalFetch = global.fetch;

beforeEach(() => {
  global.fetch = mock.fn(async (url) => {
    if (String(url).endsWith('/oauth2/token')) {
      return new Response(JSON.stringify({ access_token: 'test-token' }), { status: 200 });
    }
    return new Response(JSON.stringify({ id: 'PAYPAL-ORDER-1', status: 'COMPLETED' }), { status: 201 });
  });
});

test.after(() => {
  global.fetch = originalFetch;
});

test('PayPal create uses a deterministic request ID no longer than 38 characters', async () => {
  await paypal.createOrder(25, 'USD', '507f1f77bcf86cd799439031');
  await paypal.createOrder(25, 'USD', '507f1f77bcf86cd799439031');
  const first = global.fetch.mock.calls[1].arguments[1].headers['PayPal-Request-Id'];
  const second = global.fetch.mock.calls[3].arguments[1].headers['PayPal-Request-Id'];

  assert.equal(typeof first, 'string');
  assert.equal(first, second);
  assert.ok(first.length <= 38);
});

test('PayPal capture uses a stable request ID distinct from create', async () => {
  await paypal.createOrder(25, 'USD', '507f1f77bcf86cd799439031');
  await paypal.captureOrder('PAYPAL-ORDER-1');
  await paypal.captureOrder('PAYPAL-ORDER-1');
  const createId = global.fetch.mock.calls[1].arguments[1].headers['PayPal-Request-Id'];
  const firstCapture = global.fetch.mock.calls[3].arguments[1].headers['PayPal-Request-Id'];
  const secondCapture = global.fetch.mock.calls[5].arguments[1].headers['PayPal-Request-Id'];

  assert.equal(firstCapture, secondCapture);
  assert.notEqual(createId, firstCapture);
  assert.ok(firstCapture.length <= 38);
});

test('getOrderDetails fetches the provider order with bearer authentication', async () => {
  const result = await paypal.getOrderDetails('PAYPAL-ORDER-1');
  const call = global.fetch.mock.calls[1];

  assert.equal(result.id, 'PAYPAL-ORDER-1');
  assert.equal(call.arguments[0], 'https://paypal.invalid/v2/checkout/orders/PAYPAL-ORDER-1');
  assert.equal(call.arguments[1].method, 'GET');
  assert.equal(call.arguments[1].headers.Authorization, 'Bearer test-token');
});

test('PayPal non-2xx errors preserve status and provider issue for reconciliation', async () => {
  global.fetch.mock.mockImplementation(async (url) => {
    if (String(url).endsWith('/oauth2/token')) {
      return new Response(JSON.stringify({ access_token: 'test-token' }), { status: 200 });
    }
    return new Response(JSON.stringify({
      name: 'UNPROCESSABLE_ENTITY',
      details: [{ issue: 'ORDER_ALREADY_CAPTURED' }],
    }), { status: 422 });
  });

  await assert.rejects(
    () => paypal.captureOrder('PAYPAL-ORDER-1'),
    (error) => error.status === 422 && error.code === 'ORDER_ALREADY_CAPTURED'
  );
});
