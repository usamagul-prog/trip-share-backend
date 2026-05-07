import { Router } from 'express';
import { chatController } from './chat.controller';
const router = Router();
router.get('/:bookingId/messages', chatController.getMessages);
export default router;
