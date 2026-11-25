const { Router } = require('express');
const { z } = require('zod');
const shipmentController = require('../controllers/shipmentController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = Router();

const updateShipmentSchema = z.object({
  carrier: z.string().trim().min(1).max(100),
  trackingCode: z.string().trim().min(1).max(120),
});

router.use(authenticate);

router.get('/order/:orderId', shipmentController.getByOrderId);
router.put(
  '/order/:orderId',
  authorize('operador'),
  validate(updateShipmentSchema),
  shipmentController.update
);

module.exports = router;
module.exports.updateShipmentSchema = updateShipmentSchema;
