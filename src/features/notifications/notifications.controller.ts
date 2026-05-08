import { Request, Response } from 'express';
import {
  notificationsService,
  NotificationNotFoundError,
  NotificationOwnershipError,
} from './notifications.service';

export const notificationsController = {
  async list(req: Request, res: Response): Promise<void> {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const { notifications, unreadCount, total } = await notificationsService.getForUser(
      req.user!._id.toString(),
      page,
      limit
    );
    res.json({ notifications, unreadCount, total, page, limit });
  },

  async markRead(req: Request, res: Response): Promise<void> {
    try {
      const notification = await notificationsService.markRead(
        req.params.id as string,
        req.user!._id.toString()
      );
      res.json({ notification });
    } catch (err) {
      if (err instanceof NotificationNotFoundError) {
        res.status(404).json({ error: err.message });
        return;
      }
      if (err instanceof NotificationOwnershipError) {
        res.status(403).json({ error: err.message });
        return;
      }
      throw err;
    }
  },

  async markAllRead(req: Request, res: Response): Promise<void> {
    await notificationsService.markAllRead(req.user!._id.toString());
    res.status(204).end();
  },
};
