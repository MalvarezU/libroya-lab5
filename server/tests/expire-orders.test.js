const assert = require('node:assert/strict');
const { beforeEach, test, mock } = require('node:test');

function stubModule(modulePath, exports) {
  const id = require.resolve(modulePath);
  require.cache[id] = { id, filename: id, loaded: true, exports };
}

function orderQuery(value) {
  return {
    select() {
      return this;
    },
    limit() {
      return this;
    },
    then(resolve, reject) {
      return Promise.resolve(value).then(resolve, reject);
    },
  };
}

const Order = { find: mock.fn() };
const cancelPendingOrder = mock.fn();
stubModule('../src/models/Order', Order);
stubModule('../src/services/orderCancellation', { cancelPendingOrder });

const { expireOrders, startExpireOrdersJob, EXPIRY_MS } = require('../src/jobs/expireOrders');

beforeEach(() => {
  Order.find.mock.resetCalls();
  cancelPendingOrder.mock.resetCalls();
  Order.find.mock.mockImplementation(() => orderQuery([]));
  cancelPendingOrder.mock.mockImplementation(async () => ({ cancelled: true }));
});

test('expiry selects pending orders older than 30 minutes and cancels them through the shared service', async () => {
  const now = new Date('2026-11-24T12:00:00.000Z');
  Order.find.mock.mockImplementation(() => orderQuery([{ _id: 'order-1' }, { _id: 'order-2' }]));

  const result = await expireOrders({ now, limit: 25 });

  assert.deepEqual(Order.find.mock.calls[0].arguments[0], {
    status: 'PENDING_PAYMENT',
    createdAt: { $lt: new Date('2026-11-24T11:30:00.000Z') },
  });
  assert.equal(Order.find.mock.calls[0].arguments[0].createdAt.$lt.getTime(), now.getTime() - EXPIRY_MS);
  assert.equal(cancelPendingOrder.mock.callCount(), 2);
  assert.deepEqual(cancelPendingOrder.mock.calls[0].arguments, ['order-1', { allowSystem: true }]);
  assert.equal(result.expired, 2);
  assert.deepEqual(result.failed, []);
});

test('expiry continues after one cancellation fails and reports the failure', async () => {
  Order.find.mock.mockImplementation(() => orderQuery([{ _id: 'order-1' }, { _id: 'order-2' }]));
  cancelPendingOrder.mock.mockImplementation(async (id) => {
    if (id === 'order-1') throw new Error('write conflict');
    return { cancelled: true };
  });

  const result = await expireOrders({ now: new Date('2026-11-24T12:00:00.000Z') });

  assert.equal(result.expired, 1);
  assert.equal(result.failed.length, 1);
  assert.equal(result.failed[0].orderId, 'order-1');
  assert.equal(cancelPendingOrder.mock.callCount(), 2);
});

test('expiry job interval is unreferenced so it does not keep the process alive', () => {
  const timer = startExpireOrdersJob({ intervalMs: 60_000 });
  try {
    assert.equal(timer.hasRef(), false);
  } finally {
    clearInterval(timer);
  }
});
