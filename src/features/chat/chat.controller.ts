import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { chatService } from './chat.service';

export const chatController = {
  async getMessages(req: Request, res: Response): Promise<void> {
    const bookingId = req.params.bookingId as string;
    if (!mongoose.isValidObjectId(bookingId)) {
      res.status(400).json({ error: 'Invalid booking ID' });
      return;
    }
    const userId = req.user!._id;
    const hasAccess = await chatService.validateBookingAccess(bookingId, userId);
    if (!hasAccess) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    await chatService.markRead(bookingId, userId);
    const messages = await chatService.getMessages(bookingId);
    res.json({ messages });
  },

  async reportMessage(req: Request, res: Response): Promise<void> {
    const messageId = req.params.messageId as string;
    const { reason } = req.body as { reason: string };
    if (!reason?.trim()) {
      res.status(400).json({ error: 'reason is required' });
      return;
    }
    if (!mongoose.isValidObjectId(messageId)) {
      res.status(400).json({ error: 'Invalid message ID' });
      return;
    }
    const report = await chatService.reportMessage(messageId, req.user!._id, reason.trim());
    if (!report) {
      res.status(404).json({ error: 'Message not found' });
      return;
    }
    res.status(201).json({ report });
  },
};
