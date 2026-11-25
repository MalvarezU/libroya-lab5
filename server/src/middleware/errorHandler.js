const config = require('../config/env');

// Centralized error handler. Never leak stack traces in production.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';

  // Zod errors come through as arrays sometimes; normalize.
  let payload = { error: message };
  if (err.errors && Array.isArray(err.errors)) {
    payload = { error: message, details: err.errors };
  }

  if (config.nodeEnv !== 'production') {
    // Only include minimal debug info outside prod; never secrets.
    if (err.stack) payload.stack = err.stack;
  }

  res.status(status).json(payload);
}

module.exports = errorHandler;