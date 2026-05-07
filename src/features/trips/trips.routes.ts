import { Router } from 'express';
import { tripsController } from './trips.controller';

const router = Router();

router.post('/', tripsController.create);
router.get('/', tripsController.search);
router.get('/:id', tripsController.getOne);
router.patch('/:id/cancel', tripsController.cancel);

export default router;
