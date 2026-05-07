import { Request, Response } from 'express';

export const tripsController = {
  async create(req: Request, res: Response): Promise<void> {
    res.status(501).json({ message: 'Not implemented' });
  },
  async search(req: Request, res: Response): Promise<void> {
    res.status(501).json({ message: 'Not implemented' });
  },
  async getOne(req: Request, res: Response): Promise<void> {
    res.status(501).json({ message: 'Not implemented' });
  },
  async cancel(req: Request, res: Response): Promise<void> {
    res.status(501).json({ message: 'Not implemented' });
  },
};
