const assert = require('node:assert/strict');
const { beforeEach, test, mock } = require('node:test');

function stubModule(modulePath, exports) {
  const id = require.resolve(modulePath);
  require.cache[id] = { id, filename: id, loaded: true, exports };
}

const Order = { findById: mock.fn() };
const Shipment = { findOne: mock.fn(), findOneAndUpdate: mock.fn() };
const socket = {
  emitOrderStatusChanged: mock.fn(),
  emitOrderUpdated: mock.fn(),
};
const session = {
  withTransaction: mock.fn(async (callback) => callback()),
  endSession: mock.fn(async () => {}),
};
const mongoose = {
  startSession: mock.fn(async () => session),
  isValidObjectId: mock.fn(() => true),
};

stubModule('mongoose', mongoose);
stubModule('../src/models/Book', {});
stubModule('../src/models/Order', Order);
stubModule('../src/models/Shipment', Shipment);
stubModule('../src/socket', socket);

const orderController = require('../src/controllers/orderController');
const shipmentController = require('../src/controllers/shipmentController');

function createOrder(status = 'PAID') {
  return {
    _id: 'order-1',
    userId: 'user-1',
    address: 'Calle Falsa 123',
    status,
    save: mock.fn(async () => {}),
  };
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

beforeEach(() => {
  Order.findById.mock.resetCalls();
  Shipment.findOne.mock.resetCalls();
  Shipment.findOneAndUpdate.mock.resetCalls();
  socket.emitOrderStatusChanged.mock.resetCalls();
  socket.emitOrderUpdated.mock.resetCalls();
  session.withTransaction.mock.resetCalls();
  session.endSession.mock.resetCalls();
  mongoose.startSession.mock.resetCalls();
  mongoose.isValidObjectId.mock.resetCalls();

  session.withTransaction.mock.mockImplementation(async (callback) => callback());
  session.endSession.mock.mockImplementation(async () => {});
  mongoose.startSession.mock.mockImplementation(async () => session);
  mongoose.isValidObjectId.mock.mockImplementation(() => true);
  Shipment.findOne.mock.mockImplementation(async () => null);
  Shipment.findOneAndUpdate.mock.mockImplementation(async () => ({}));
});

test('PREPARING creates or updates the shipment and order in one transaction', async () => {
  const order = createOrder();
  Order.findById.mock.mockImplementation(() => ({ session: () => Promise.resolve(order) }));
  const req = { params: { id: order._id }, body: { status: 'PREPARING' } };
  const res = createResponse();
  const next = mock.fn();

  await orderController.updateStatus(req, res, next);

  assert.equal(next.mock.callCount(), 0);
  assert.equal(session.withTransaction.mock.callCount(), 1);
  assert.deepEqual(Shipment.findOneAndUpdate.mock.calls[0].arguments, [
    { orderId: order._id },
    { $set: { address: order.address, status: 'PREPARING' } },
    { upsert: true, new: true, session, runValidators: true },
  ]);
  assert.equal(order.status, 'PREPARING');
  assert.deepEqual(order.save.mock.calls[0].arguments, [{ session }]);
  assert.equal(session.endSession.mock.callCount(), 1);
  assert.equal(socket.emitOrderStatusChanged.mock.calls[0].arguments[0], order);
  assert.equal(res.body, order);
});

test('SHIPPED saves carrier and tracking code with the shipment and order atomically', async () => {
  const order = createOrder('PREPARING');
  Order.findById.mock.mockImplementation(() => ({ session: () => Promise.resolve(order) }));
  const req = {
    params: { id: order._id },
    body: { status: 'SHIPPED', carrier: 'Correos', trackingCode: 'TRK-123' },
  };
  const res = createResponse();
  const next = mock.fn();

  await orderController.updateStatus(req, res, next);

  assert.equal(next.mock.callCount(), 0);
  assert.deepEqual(Shipment.findOneAndUpdate.mock.calls[0].arguments, [
    { orderId: order._id },
    {
      $set: {
        address: order.address,
        status: 'SHIPPED',
        carrier: 'Correos',
        trackingCode: 'TRK-123',
      },
    },
    { upsert: true, new: true, session, runValidators: true },
  ]);
  assert.equal(order.status, 'SHIPPED');
  assert.deepEqual(order.save.mock.calls[0].arguments, [{ session }]);
});

test('SHIPPED rejects missing shipment data before saving either document', async () => {
  const order = createOrder('PREPARING');
  Order.findById.mock.mockImplementation(() => ({ session: () => Promise.resolve(order) }));
  const req = { params: { id: order._id }, body: { status: 'SHIPPED', carrier: ' ' } };
  const res = createResponse();
  const next = mock.fn();

  await orderController.updateStatus(req, res, next);

  assert.equal(next.mock.callCount(), 1);
  assert.equal(next.mock.calls[0].arguments[0].status, 400);
  assert.equal(Shipment.findOneAndUpdate.mock.callCount(), 0);
  assert.equal(order.save.mock.callCount(), 0);
  assert.equal(session.endSession.mock.callCount(), 1);
});

test('DELIVERED updates the shipment and order in one transaction', async () => {
  const order = createOrder('SHIPPED');
  Order.findById.mock.mockImplementation(() => ({ session: () => Promise.resolve(order) }));
  const req = { params: { id: order._id }, body: { status: 'DELIVERED' } };
  const res = createResponse();
  const next = mock.fn();

  await orderController.updateStatus(req, res, next);

  assert.equal(next.mock.callCount(), 0);
  assert.deepEqual(Shipment.findOneAndUpdate.mock.calls[0].arguments[1], {
    $set: { address: order.address, status: 'DELIVERED' },
  });
  assert.equal(order.status, 'DELIVERED');
  assert.deepEqual(order.save.mock.calls[0].arguments, [{ session }]);
});

test('an invalid transition does not update the shipment or order', async () => {
  const order = createOrder('PAID');
  Order.findById.mock.mockImplementation(() => ({ session: () => Promise.resolve(order) }));
  const req = { params: { id: order._id }, body: { status: 'DELIVERED' } };
  const res = createResponse();
  const next = mock.fn();

  await orderController.updateStatus(req, res, next);

  assert.equal(next.mock.calls[0].arguments[0].status, 400);
  assert.equal(Shipment.findOneAndUpdate.mock.callCount(), 0);
  assert.equal(order.save.mock.callCount(), 0);
});

test('a shipment write failure prevents the order save and closes the session', async () => {
  const order = createOrder();
  const failure = new Error('Shipment write failed');
  Order.findById.mock.mockImplementation(() => ({ session: () => Promise.resolve(order) }));
  Shipment.findOneAndUpdate.mock.mockImplementation(async () => { throw failure; });
  const req = { params: { id: order._id }, body: { status: 'PREPARING' } };
  const res = createResponse();
  const next = mock.fn();

  await orderController.updateStatus(req, res, next);

  assert.equal(next.mock.calls[0].arguments[0], failure);
  assert.equal(order.save.mock.callCount(), 0);
  assert.equal(session.endSession.mock.callCount(), 1);
});

test('shipment lookup returns the shipment to its owner', async () => {
  Order.findById.mock.mockImplementation(() => ({
    select: () => Promise.resolve({ _id: 'order-1', userId: 'user-1' }),
  }));
  const shipment = { _id: 'shipment-1', orderId: 'order-1', status: 'SHIPPED' };
  Shipment.findOne.mock.mockImplementation(async () => shipment);
  const req = { params: { orderId: 'order-1' }, user: { id: 'user-1', role: 'cliente' } };
  const res = createResponse();
  const next = mock.fn();

  await shipmentController.getByOrderId(req, res, next);

  assert.equal(next.mock.callCount(), 0);
  assert.equal(res.body, shipment);
});

test('shipment lookup allows an operator', async () => {
  Order.findById.mock.mockImplementation(() => ({
    select: () => Promise.resolve({ _id: 'order-1', userId: 'user-1' }),
  }));
  const shipment = { _id: 'shipment-1', orderId: 'order-1', status: 'PREPARING' };
  Shipment.findOne.mock.mockImplementation(async () => shipment);
  const req = { params: { orderId: 'order-1' }, user: { id: 'operator-1', role: 'operador' } };
  const res = createResponse();
  const next = mock.fn();

  await shipmentController.getByOrderId(req, res, next);

  assert.equal(next.mock.callCount(), 0);
  assert.equal(res.body, shipment);
});

test('shipment lookup rejects a different client', async () => {
  Order.findById.mock.mockImplementation(() => ({
    select: () => Promise.resolve({ _id: 'order-1', userId: 'user-1' }),
  }));
  const req = { params: { orderId: 'order-1' }, user: { id: 'user-2', role: 'cliente' } };
  const res = createResponse();
  const next = mock.fn();

  await shipmentController.getByOrderId(req, res, next);

  assert.equal(next.mock.calls[0].arguments[0].status, 403);
});

test('shipment lookup returns 404 when the order does not exist', async () => {
  Order.findById.mock.mockImplementation(() => ({ select: () => Promise.resolve(null) }));
  const req = { params: { orderId: 'order-1' }, user: { id: 'user-1', role: 'cliente' } };
  const res = createResponse();
  const next = mock.fn();

  await shipmentController.getByOrderId(req, res, next);

  assert.equal(next.mock.calls[0].arguments[0].status, 404);
});

test('shipment lookup returns 404 when the shipment does not exist', async () => {
  Order.findById.mock.mockImplementation(() => ({
    select: () => Promise.resolve({ _id: 'order-1', userId: 'user-1' }),
  }));
  Shipment.findOne.mock.mockImplementation(async () => null);
  const req = { params: { orderId: 'order-1' }, user: { id: 'user-1', role: 'cliente' } };
  const res = createResponse();
  const next = mock.fn();

  await shipmentController.getByOrderId(req, res, next);

  assert.equal(next.mock.calls[0].arguments[0].status, 404);
});

test('operator can edit shipment tracking data without changing its status', async () => {
  const shipment = {
    _id: 'shipment-1',
    status: 'SHIPPED',
    carrier: 'Updated carrier',
    trackingCode: 'UPDATED-123',
  };
  Shipment.findOneAndUpdate.mock.mockImplementation(async () => shipment);
  const req = {
    params: { orderId: 'order-1' },
    body: { carrier: 'Updated carrier', trackingCode: 'UPDATED-123' },
  };
  const res = createResponse();
  const next = mock.fn();

  await shipmentController.update(req, res, next);

  assert.equal(next.mock.callCount(), 0);
  assert.deepEqual(Shipment.findOneAndUpdate.mock.calls[0].arguments, [
    { orderId: 'order-1' },
    { $set: { carrier: 'Updated carrier', trackingCode: 'UPDATED-123' } },
    { new: true, runValidators: true },
  ]);
  assert.equal(res.body, shipment);
});
