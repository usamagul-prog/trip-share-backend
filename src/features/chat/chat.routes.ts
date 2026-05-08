import { Router } from 'express';
import { chatController } from './chat.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.get('/:bookingId/messages', authenticate, chatController.getMessages);
router.post('/messages/:messageId/report', authenticate, chatController.reportMessage);

export default router;
