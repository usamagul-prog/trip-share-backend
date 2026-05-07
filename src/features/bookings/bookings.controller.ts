import { Request, Response } from 'express';

export const bookingsController = {
  async create(req: Request, res: Response): Promise<void> {
    res.status(501).json({ message: 'Not implemented' });
  },
  async myBookings(req: Request, res: Response): Promise<void> {
    res.status(501).json({ message: 'Not implemented' });
  },
  async updateStatus(req: Request, res: Response): Promise<void> {
    res.status(501).json({ message: 'Not implemented' });
  },
};
