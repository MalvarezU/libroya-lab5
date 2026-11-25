const { Router } = require('express');
const { z } = require('zod');
const bookController = require('../controllers/bookController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = Router();

const bookSchema = z.object({
  title: z.string().min(1),
  author: z.string().min(1),
  isbn: z.string().optional(),
  category: z.string().optional(),
  price: z.number().positive(),
  stock: z.number().int().min(0).optional(),
  coverUrl: z.string().optional(),
  available: z.boolean().optional(),
});

router.get('/', bookController.list);
router.get('/:id', bookController.getOne);

router.post('/', authenticate, authorize('operador'), validate(bookSchema), bookController.create);
router.put('/:id', authenticate, authorize('operador'), validate(bookSchema.partial()), bookController.update);
router.delete('/:id', authenticate, authorize('operador'), bookController.remove);

module.exports = router;