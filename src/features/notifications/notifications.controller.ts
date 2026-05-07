import { Request, Response } from 'express';
export const notificationsController = {
  async list(req: Request, res: Response): Promise<void> {
    res.status(501).json({ message: 'Not implemented' });
  },
  async markRead(req: Request, res: Response): Promise<void> {
    res.status(501).json({ message: 'Not implemented' });
  },
};
