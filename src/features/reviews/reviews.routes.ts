import { Router } from 'express';
import { reviewsController } from './reviews.controller';
const router = Router();
router.post('/', reviewsController.create);
router.get('/user/:userId', reviewsController.forUser);
export default router;
