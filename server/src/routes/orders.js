const { Router } = require('express');
const { z } = require('zod');
const orderController = require('../controllers/orderController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = Router();

const createOrderSchema = z.object({
  items: z.array(
    z.object({
      bookId: z.string().min(1),
      quantity: z.number().int().min(1),
    })
  ).min(1),
  address: z.string().min(1),
});

const updateStatusSchema = z.object({
  status: z.enum(['PREPARING', 'SHIPPED', 'DELIVERED']),
});

router.use(authenticate);

router.post('/', validate(createOrderSchema), orderController.create);
router.get('/mine', orderController.listMine);
router.get('/', authorize('operador'), orderController.listAll);
router.get('/:id', orderController.getById);
router.patch('/:id/status', authorize('operador'), validate(updateStatusSchema), orderController.updateStatus);

module.exports = router;