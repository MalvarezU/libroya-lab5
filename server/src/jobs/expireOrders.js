const Order = require('../models/Order');
const { cancelPendingOrder } = require('../services/orderCancellation');

const EXPIRY_MS = 30 * 60 * 1000;
const DEFAULT_INTERVAL_MS = 60 * 1000;
const DEFAULT_BATCH_SIZE = 100;

async function expireOrders({
  now = new Date(),
  olderThanMs = EXPIRY_MS,
  limit = DEFAULT_BATCH_SIZE,
  cancel = cancelPendingOrder,
} = {}) {
  const cutoff = new Date(now.getTime() - olderThanMs);
  const orders = await Order.find({
    status: 'PENDING_PAYMENT',
    createdAt: { $lt: cutoff },
  })
    .select('_id')
    .limit(limit);

  let expired = 0;
  const failed = [];
  for (const order of orders) {
    const orderId = order._id.toString();
    try {
      const result = await cancel(orderId, { allowSystem: true });
      if (result.cancelled) expired += 1;
    } catch (err) {
      failed.push({ orderId, message: err.message || 'Cancellation failed' });
    }
  }
  return { expired, failed };
}

function startExpireOrdersJob({ intervalMs = DEFAULT_INTERVAL_MS, ...options } = {}) {
  const timer = setInterval(() => {
    expireOrders(options).catch((err) => {
      console.error('Order expiry job failed:', err.message);
    });
  }, intervalMs);
  timer.unref();
  return timer;
}

module.exports = {
  EXPIRY_MS,
  DEFAULT_INTERVAL_MS,
  expireOrders,
  startExpireOrdersJob,
};
