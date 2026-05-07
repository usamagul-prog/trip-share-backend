import { Router } from 'express';
import { adminController } from './admin.controller';
const router = Router();
router.get('/metrics', adminController.metrics);
router.get('/users', adminController.users);
router.get('/trips', adminController.trips);
export default router;
