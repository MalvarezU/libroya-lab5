const jwt = require('jsonwebtoken');
const config = require('../config/env');

function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next({ status: 401, message: 'Authentication required' });
  }
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.user = { id: payload.id, role: payload.role };
    return next();
  } catch (err) {
    return next({ status: 401, message: 'Invalid or expired token' });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) return next({ status: 401, message: 'Authentication required' });
    if (roles.length && !roles.includes(req.user.role)) {
      return next({ status: 403, message: 'Forbidden' });
    }
    return next();
  };
}

module.exports = { authenticate, authorize };