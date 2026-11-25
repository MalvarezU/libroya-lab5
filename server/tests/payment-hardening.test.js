const assert = require('node:assert/strict');
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
const Order = {
  findById: mock.fn(),
  findOneAndUpdate: mock.fn(),
};
const Payment = {
  findOne: mock.fn(),
  findById: mock.fn(),
  findOneAndUpdate: mock.fn(),
  create: mock.fn(),
  updateOne: mock.fn(),
};
class PayPalApiError extends Error {}

const paypal = {
  PayPalApiError,
  createOrder: mock.fn(),
  captureOrder: mock.fn(),
  getOrderDetails: mock.fn(),
};
const emit = mock.fn();
const socket = {
  getIO: mock.fn(() => ({ to: () => ({ emit }) })),
};

stubModule('mongoose', mongoose);
stubModule('../src/models/Order', Order);
stubModule('../src/models/Payment', Payment);
stubModule('../src/utils/paypal', paypal);
stubModule('../src/socket', socket);

const paymentController = require('../src/controllers/paymentController');

const USER_ID = '507f1f77bcf86cd799439011';
const OTHER_USER_ID = '507f1f77bcf86cd799439012';
const ORDER_ID = '507f1f77bcf86cd799439031';
const PAYMENT_ID = '507f1f77bcf86cd799439041';
const PROVIDER_ORDER_ID = 'PAYPAL-ORDER-1';

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

function createOrder(overrides = {}) {
  return {
    _id: ORDER_ID,
    userId: USER_ID,
    total: 25,
    status: 'PENDING_PAYMENT',
    paymentStatus: 'UNPAID',
    items: [{ title: 'Book', quantity: 1 }],
    ...overrides,
  };
}

function createPayment(overrides = {}) {
  return {
    _id: PAYMENT_ID,
    orderId: ORDER_ID,
    providerOrderId: PROVIDER_ORDER_ID,
    amount: 25,
    currency: 'USD',
    status: 'CREATED',
    ...overrides,
  };
}

function captureResponse(overrides = {}) {
  const capture = {
    id: 'CAPTURE-1',
    status: 'COMPLETED',
    amount: { value: '25.00', currency_code: 'USD' },
    ...overrides.capture,
  };
  return {
    id: PROVIDER_ORDER_ID,
    status: 'COMPLETED',
    purchase_units: [{
      custom_id: ORDER_ID,
      payments: { captures: [capture] },
      ...overrides.purchaseUnit,
    }],
    ...overrides.topLevel,
  };
}

function captureRequest(overrides = {}) {
  return {
    params: { orderId: ORDER_ID },
    user: { id: USER_ID, role: 'cliente' },
    body: { providerOrderId: PROVIDER_ORDER_ID },
    ...overrides,
  };
}

beforeEach(() => {
  for (const fn of [
    Order.findById,
    Order.findOneAndUpdate,
    Payment.findOne,
    Payment.findById,
    Payment.findOneAndUpdate,
    Payment.create,
    Payment.updateOne,
    paypal.createOrder,
    paypal.captureOrder,
    paypal.getOrderDetails,
    emit,
    session.withTransaction,
    session.endSession,
    mongoose.startSession,
  ]) {
    fn.mock.resetCalls();
  }

  session.withTransaction.mock.mockImplementation(async (callback) => callback());
  session.endSession.mock.mockImplementation(async () => {});
  mongoose.startSession.mock.mockImplementation(async () => session);
  Order.findById.mock.mockImplementation(() => queryResult(createOrder()));
  Order.findOneAndUpdate.mock.mockImplementation(async (_filter, update) => ({
    ...createOrder(),
    ...update.$set,
  }));
  Payment.findOne.mock.mockImplementation(() => queryResult(createPayment()));
  Payment.findById.mock.mockImplementation(() => queryResult(createPayment()));
  Payment.findOneAndUpdate.mock.mockImplementation(async (_filter, update) => ({
    ...createPayment(),
    ...update.$set,
  }));
  Payment.create.mock.mockImplementation(async (doc) => ({ _id: PAYMENT_ID, ...doc }));
  Payment.updateOne.mock.mockImplementation(async () => ({ modifiedCount: 1 }));
  paypal.createOrder.mock.mockImplementation(async () => ({ id: PROVIDER_ORDER_ID }));
  paypal.captureOrder.mock.mockImplementation(async () => captureResponse());
  paypal.getOrderDetails.mock.mockImplementation(async () => captureResponse());
});

test('PayPal create reuses the single in-flight payment instead of creating a duplicate', async () => {
  const payment = createPayment();
  Payment.findOne.mock.mockImplementation(() => queryResult(payment));
  const req = { params: { orderId: ORDER_ID }, user: { id: USER_ID, role: 'cliente' } };
  const res = createResponse();
  const next = mock.fn();

  await paymentController.createPaypalOrder(req, res, next);

  assert.equal(next.mock.callCount(), 0);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.providerOrderId, PROVIDER_ORDER_ID);
  assert.equal(paypal.createOrder.mock.callCount(), 0);
  assert.equal(Payment.create.mock.callCount(), 0);
});

test('PayPal create makes one payment document for a new pending order', async () => {
  Payment.findOne.mock.mockImplementation(() => queryResult(null));
  const req = { params: { orderId: ORDER_ID }, user: { id: USER_ID, role: 'cliente' } };
  const res = createResponse();
  const next = mock.fn();

  await paymentController.createPaypalOrder(req, res, next);

  assert.equal(next.mock.callCount(), 0);
  assert.equal(res.statusCode, 201);
  assert.equal(Payment.create.mock.callCount(), 1);
  assert.equal(Payment.create.mock.calls[0].arguments[0].orderId, ORDER_ID);
  assert.equal(Payment.create.mock.calls[0].arguments[0].providerOrderId, PROVIDER_ORDER_ID);
  assert.equal(Payment.create.mock.calls[0].arguments[0].amount, 25);
});

test('PayPal create recovers from a duplicate-key race by reusing the winning payment', async () => {
  let reads = 0;
  Payment.findOne.mock.mockImplementation(() => queryResult(++reads === 1 ? null : createPayment()));
  Payment.create.mock.mockImplementation(async () => {
    throw Object.assign(new Error('duplicate key'), { code: 11000 });
  });
  const req = { params: { orderId: ORDER_ID }, user: { id: USER_ID, role: 'cliente' } };
  const res = createResponse();
  const next = mock.fn();

  await paymentController.createPaypalOrder(req, res, next);

  assert.equal(next.mock.callCount(), 0);
  assert.equal(res.body.providerOrderId, PROVIDER_ORDER_ID);
  assert.equal(Payment.findOne.mock.callCount(), 2);
});

test('PayPal create updates a failed payment for retry without replacing its provider order', async () => {
  Payment.findOne.mock.mockImplementation(() => queryResult(createPayment({ status: 'FAILED' })));
  const req = { params: { orderId: ORDER_ID }, user: { id: USER_ID, role: 'cliente' } };
  const res = createResponse();
  const next = mock.fn();

  await paymentController.createPaypalOrder(req, res, next);

  assert.equal(next.mock.callCount(), 0);
  assert.equal(res.body.payment.status, 'CREATED');
  assert.equal(res.body.providerOrderId, PROVIDER_ORDER_ID);
  assert.equal(paypal.createOrder.mock.callCount(), 0);
  assert.equal(Payment.create.mock.callCount(), 0);
});

test('PayPal create re-reads a concurrent capture instead of returning stale failed state', async () => {
  let reads = 0;
  Payment.findOne.mock.mockImplementation(() => queryResult(
    ++reads === 1
      ? createPayment({ status: 'FAILED' })
      : createPayment({ status: 'CAPTURED', captureId: 'CAPTURE-1' })
  ));
  Payment.findOneAndUpdate.mock.mockImplementation(async () => null);
  const req = { params: { orderId: ORDER_ID }, user: { id: USER_ID, role: 'cliente' } };
  const res = createResponse();
  const next = mock.fn();

  await paymentController.createPaypalOrder(req, res, next);

  assert.equal(next.mock.callCount(), 0);
  assert.equal(res.body.payment.status, 'CAPTURED');
  assert.equal(res.body.alreadyCaptured, true);
  assert.equal(paypal.createOrder.mock.callCount(), 0);
});

test('PayPal create is owner-only and rejects non-pending orders before calling PayPal', async () => {
  Order.findById.mock.mockImplementation(() => queryResult(createOrder({ status: 'PREPARING', paymentStatus: 'PAID' })));
  const req = { params: { orderId: ORDER_ID }, user: { id: OTHER_USER_ID, role: 'cliente' } };
  const next = mock.fn();

  await paymentController.createPaypalOrder(req, createResponse(), next);

  assert.equal(next.mock.calls[0].arguments[0].status, 403);
  Order.findById.mock.mockImplementation(() => queryResult(createOrder({ status: 'PREPARING', paymentStatus: 'PAID' })));
  await paymentController.createPaypalOrder(
    { params: { orderId: ORDER_ID }, user: { id: USER_ID, role: 'cliente' } },
    createResponse(),
    next
  );
  assert.equal(next.mock.calls[1].arguments[0].status, 409);
  assert.equal(paypal.createOrder.mock.callCount(), 0);
});

test('verified capture updates the payment and marks a pending order paid', async () => {
  const req = captureRequest();
  const res = createResponse();
  const next = mock.fn();

  await paymentController.capture(req, res, next);

  assert.equal(next.mock.callCount(), 0);
  assert.equal(res.body.payment.status, 'CAPTURED');
  assert.equal(res.body.payment.captureId, 'CAPTURE-1');
  assert.equal(res.body.order.status, 'PAID');
  assert.equal(res.body.order.paymentStatus, 'PAID');
  assert.deepEqual(Order.findOneAndUpdate.mock.calls[0].arguments[1], {
    $set: { status: 'PAID', paymentStatus: 'PAID' },
  });
  assert.equal(session.endSession.mock.callCount(), 1);
});

const invalidCaptures = [
  ['top-level provider order mismatch', captureResponse({ topLevel: { id: 'OTHER-ORDER' } })],
  ['empty capture identifier', captureResponse({ capture: { id: '' } })],
  ['purchase unit order mismatch', captureResponse({ purchaseUnit: { custom_id: 'OTHER-ORDER' } })],
  ['non-completed capture', captureResponse({ capture: { status: 'PENDING' } })],
  ['non-finite amount', captureResponse({ capture: { amount: { value: 'NaN', currency_code: 'USD' } } })],
  ['infinite amount', captureResponse({ capture: { amount: { value: 'Infinity', currency_code: 'USD' } } })],
  ['wrong amount', captureResponse({ capture: { amount: { value: '24.99', currency_code: 'USD' } } })],
  ['wrong currency', captureResponse({ capture: { amount: { value: '25.00', currency_code: 'EUR' } } })],
];

for (const [name, response] of invalidCaptures) {
  test(`capture rejects ${name} without marking the order paid`, async () => {
    paypal.captureOrder.mock.mockImplementation(async () => response);
    const next = mock.fn();

    await paymentController.capture(captureRequest(), createResponse(), next);

    assert.equal(next.mock.callCount(), 1);
    assert.equal(next.mock.calls[0].arguments[0].status, 400);
    assert.equal(Order.findOneAndUpdate.mock.callCount(), 0);
    assert.equal(Payment.updateOne.mock.callCount(), 1);
  });
}

test('non-2xx capture response is reconciled through verified PayPal order details', async () => {
  paypal.captureOrder.mock.mockImplementation(async () => {
    throw Object.assign(new Error('ORDER_ALREADY_CAPTURED'), { status: 422 });
  });
  const res = createResponse();
  const next = mock.fn();

  await paymentController.capture(captureRequest(), res, next);

  assert.equal(next.mock.callCount(), 0);
  assert.equal(paypal.getOrderDetails.mock.callCount(), 1);
  assert.equal(paypal.getOrderDetails.mock.calls[0].arguments[0], PROVIDER_ORDER_ID);
  assert.equal(res.body.payment.status, 'CAPTURED');
  assert.equal(res.body.order.status, 'PAID');
  assert.equal(paypal.captureOrder.mock.callCount(), 1);
});

test('failed reconciliation never marks the order paid', async () => {
  paypal.captureOrder.mock.mockImplementation(async () => {
    throw Object.assign(new Error('ORDER_ALREADY_CAPTURED'), { status: 422 });
  });
  paypal.getOrderDetails.mock.mockImplementation(async () => captureResponse({
    capture: { amount: { value: '1.00', currency_code: 'USD' } },
  }));
  const next = mock.fn();

  await paymentController.capture(captureRequest(), createResponse(), next);

  assert.equal(next.mock.callCount(), 1);
  assert.equal(Order.findOneAndUpdate.mock.callCount(), 0);
});

test('capture retry after payment completed returns the existing result without regressing order status', async () => {
  const order = createOrder({ status: 'PREPARING', paymentStatus: 'PAID' });
  const payment = createPayment({ status: 'CAPTURED', captureId: 'CAPTURE-1' });
  Order.findById.mock.mockImplementation(() => queryResult(order));
  Payment.findOne.mock.mockImplementation(() => queryResult(payment));
  const res = createResponse();
  const next = mock.fn();

  await paymentController.capture(captureRequest(), res, next);

  assert.equal(next.mock.callCount(), 0);
  assert.equal(res.body.alreadyCaptured, true);
  assert.equal(res.body.order.status, 'PREPARING');
  assert.equal(paypal.captureOrder.mock.callCount(), 0);
  assert.equal(Order.findOneAndUpdate.mock.callCount(), 0);
  assert.equal(mongoose.startSession.mock.callCount(), 0);
});

test('capture rejects a non-pending order before contacting PayPal', async () => {
  Order.findById.mock.mockImplementation(() => queryResult(createOrder({ status: 'SHIPPED', paymentStatus: 'PAID' })));
  const next = mock.fn();

  await paymentController.capture(captureRequest(), createResponse(), next);

  assert.equal(next.mock.calls[0].arguments[0].status, 409);
  assert.equal(paypal.captureOrder.mock.callCount(), 0);
});

test('capture rejects a different owner before contacting PayPal', async () => {
  const next = mock.fn();

  await paymentController.capture(
    captureRequest({ user: { id: OTHER_USER_ID, role: 'cliente' } }),
    createResponse(),
    next
  );

  assert.equal(next.mock.calls[0].arguments[0].status, 403);
  assert.equal(paypal.captureOrder.mock.callCount(), 0);
});

test('capture persistence conflicts instead of emitting success when the payment did not become captured', async () => {
  let reads = 0;
  Payment.findById.mock.mockImplementation(() => queryResult(
    ++reads === 1 ? createPayment() : createPayment({ status: 'FAILED' })
  ));
  Payment.findOneAndUpdate.mock.mockImplementation(async () => null);
  const next = mock.fn();

  await paymentController.capture(captureRequest(), createResponse(), next);

  assert.equal(next.mock.callCount(), 1);
  assert.equal(next.mock.calls[0].arguments[0].status, 409);
  assert.equal(Order.findOneAndUpdate.mock.callCount(), 0);
  assert.equal(emit.mock.callCount(), 0);
});

test('capture rejects malformed order and provider identifiers', async () => {
  const malformed = captureRequest({ params: { orderId: 'bad-id' } });
  await paymentController.capture(malformed, createResponse(), mock.fn());
  const next = mock.fn();
  await paymentController.capture(captureRequest({ body: { providerOrderId: 'OTHER' } }), createResponse(), next);

  assert.equal(next.mock.calls[0].arguments[0].status, 400);
  assert.equal(paypal.captureOrder.mock.callCount(), 0);
});
