import { Router } from 'express';
import { notificationsController } from './notifications.controller';
const router = Router();
router.get('/', notificationsController.list);
router.patch('/:id/read', notificationsController.markRead);
export default router;
