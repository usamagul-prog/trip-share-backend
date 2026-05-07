import { Request, Response } from 'express';
export const adminController = {
  async metrics(req: Request, res: Response): Promise<void> {
    res.status(501).json({ message: 'Not implemented' });
  },
  async users(req: Request, res: Response): Promise<void> {
    res.status(501).json({ message: 'Not implemented' });
  },
  async trips(req: Request, res: Response): Promise<void> {
    res.status(501).json({ message: 'Not implemented' });
  },
};
