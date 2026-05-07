import { Request, Response } from 'express';
export const chatController = {
  async getMessages(req: Request, res: Response): Promise<void> {
    res.status(501).json({ message: 'Not implemented' });
  },
};
