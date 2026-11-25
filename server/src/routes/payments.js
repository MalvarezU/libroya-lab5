const { Router } = require('express');
const { z } = require('zod');
const paymentController = require('../controllers/paymentController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = Router();

const captureSchema = z.object({
  providerOrderId: z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/).optional(),
});

router.use(authenticate);

router.post('/orders/:orderId/paypal', paymentController.createPaypalOrder);
router.post('/orders/:orderId/capture', validate(captureSchema), paymentController.capture);

module.exports = router;