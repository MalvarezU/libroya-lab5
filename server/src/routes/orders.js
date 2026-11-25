const { Router } = require('express');
const { z } = require('zod');
const orderController = require('../controllers/orderController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { requireIdempotencyKey } = require('../middleware/idempotency');

const router = Router();

const createOrderSchema = z.object({
  items: z.array(
    z.object({
      bookId: z.string().regex(/^[0-9a-f]{24}$/i, 'Invalid book ID'),
      quantity: z.number().int().min(1).max(100),
    })
  ).min(1).max(100),
  address: z.string().trim().min(1).max(500),
});

const updateStatusSchema = z.object({
  status: z.enum(['PREPARING', 'SHIPPED', 'DELIVERED']),
  carrier: z.string().trim().min(1).max(100).optional(),
  trackingCode: z.string().trim().min(1).max(120).optional(),
}).superRefine((data, ctx) => {
  if (data.status !== 'SHIPPED') return;
  if (!data.carrier) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['carrier'],
      message: 'Carrier is required when status is SHIPPED',
    });
  }
  if (!data.trackingCode) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['trackingCode'],
      message: 'Tracking code is required when status is SHIPPED',
    });
  }
});

router.use(authenticate);

router.post('/', requireIdempotencyKey, validate(createOrderSchema), orderController.create);
router.get('/mine', orderController.listMine);
router.get('/', authorize('operador'), orderController.listAll);
router.get('/:id', orderController.getById);
router.post('/:id/cancel', orderController.cancel);
router.patch('/:id/status', authorize('operador'), validate(updateStatusSchema), orderController.updateStatus);

module.exports = router;
module.exports.createOrderSchema = createOrderSchema;
module.exports.updateStatusSchema = updateStatusSchema;