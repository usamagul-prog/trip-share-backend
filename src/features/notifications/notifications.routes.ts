import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { notificationsController } from './notifications.controller';

const router = Router();

router.get('/', authenticate, notificationsController.list);
router.patch('/read-all', authenticate, notificationsController.markAllRead);
router.patch('/:id/read', authenticate, notificationsController.markRead);

export default router;
