import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { reviewsController } from './reviews.controller';

const router = Router();

router.post('/', authenticate, reviewsController.create);
router.get('/', authenticate, reviewsController.forUser);

export default router;
