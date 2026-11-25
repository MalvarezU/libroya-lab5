const assert = require('node:assert/strict');
const { test, mock } = require('node:test');
const { requireIdempotencyKey } = require('../src/middleware/idempotency');

function run(headers) {
  const req = { headers };
  const next = mock.fn();
  requireIdempotencyKey(req, {}, next);
  return { req, next };
}

test('Idempotency-Key accepts UUIDs and safe keys from 8 to 128 characters', () => {
  for (const key of ['12345678', '550e8400-e29b-41d4-a716-446655440000', 'a'.repeat(128)]) {
    const { req, next } = run({ 'idempotency-key': key });
    assert.equal(next.mock.callCount(), 1);
    assert.equal(next.mock.calls[0].arguments[0], undefined);
    assert.equal(req.idempotencyKey, key);
  }
});

test('Idempotency-Key rejects missing, short, long, or unsafe values', () => {
  for (const key of [undefined, 'short', 'a'.repeat(129), 'has spaces', 'line\nbreak', 'slash/key']) {
    const { next } = run(key === undefined ? {} : { 'idempotency-key': key });
    assert.equal(next.mock.callCount(), 1);
    assert.equal(next.mock.calls[0].arguments[0].status, 400);
  }
});
