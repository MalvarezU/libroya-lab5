const assert = require('node:assert/strict');
const { test } = require('node:test');

function stubModule(modulePath, exports) {
  const id = require.resolve(modulePath);
  require.cache[id] = { id, filename: id, loaded: true, exports };
}

stubModule('../src/config/env', { jwtSecret: 'test-secret' });
stubModule('../src/socket', {});

const { updateStatusSchema } = require('../src/routes/orders');
const { updateShipmentSchema } = require('../src/routes/shipments');

test('order status schema accepts PREPARING without shipment data', () => {
  assert.equal(updateStatusSchema.parse({ status: 'PREPARING' }).status, 'PREPARING');
});

test('order status schema requires carrier and tracking code for SHIPPED', () => {
  assert.equal(updateStatusSchema.safeParse({ status: 'SHIPPED' }).success, false);
  assert.equal(
    updateStatusSchema.safeParse({ status: 'SHIPPED', carrier: 'Correos' }).success,
    false
  );
  assert.equal(
    updateStatusSchema.safeParse({ status: 'SHIPPED', trackingCode: 'TRK-123' }).success,
    false
  );
});

test('order status schema rejects blank carrier and tracking code', () => {
  assert.equal(
    updateStatusSchema.safeParse({ status: 'SHIPPED', carrier: ' ', trackingCode: 'TRK-123' }).success,
    false
  );
  assert.equal(
    updateStatusSchema.safeParse({ status: 'SHIPPED', carrier: 'Correos', trackingCode: ' ' }).success,
    false
  );
});

test('order status schema trims valid shipment data', () => {
  const parsed = updateStatusSchema.parse({
    status: 'SHIPPED',
    carrier: ' Correos ',
    trackingCode: ' TRK-123 ',
  });
  assert.equal(parsed.carrier, 'Correos');
  assert.equal(parsed.trackingCode, 'TRK-123');
});

test('shipment update schema requires non-blank tracking data', () => {
  assert.equal(updateShipmentSchema.safeParse({}).success, false);
  assert.equal(
    updateShipmentSchema.safeParse({ carrier: 'Correos', trackingCode: ' ' }).success,
    false
  );
});
