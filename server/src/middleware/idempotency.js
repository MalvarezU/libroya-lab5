const SAFE_IDEMPOTENCY_KEY = /^[A-Za-z0-9._:-]{8,128}$/;

function requireIdempotencyKey(req, _res, next) {
  const value = req.headers['idempotency-key'];
  if (typeof value !== 'string' || !SAFE_IDEMPOTENCY_KEY.test(value)) {
    return next({
      status: 400,
      message: 'Idempotency-Key must contain 8-128 letters, numbers, dots, underscores, colons, or hyphens',
    });
  }
  req.idempotencyKey = value;
  return next();
}

module.exports = { requireIdempotencyKey, SAFE_IDEMPOTENCY_KEY };
