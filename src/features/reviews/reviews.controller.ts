import { Request, Response } from 'express';
export const reviewsController = {
  async create(req: Request, res: Response): Promise<void> {
    res.status(501).json({ message: 'Not implemented' });
  },
  async forUser(req: Request, res: Response): Promise<void> {
    res.status(501).json({ message: 'Not implemented' });
  },
};
