import { Request, Response } from 'express';
import { adminService, AdminLoginError } from './admin.service';

export const adminController = {
  async login(req: Request, res: Response): Promise<void> {
    const { username, password } = req.body as { username: string; password: string };
    try {
      const token = adminService.loginAdmin(username, password);
      res.json({ token });
    } catch (err) {
      if (err instanceof AdminLoginError) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }
      throw err;
    }
  },

  async listUsers(_req: Request, res: Response): Promise<void> {
    res.status(501).json({ message: 'Not implemented' });
  },

  async exportUsers(_req: Request, res: Response): Promise<void> {
    res.status(501).json({ message: 'Not implemented' });
  },

  async getUser(_req: Request, res: Response): Promise<void> {
    res.status(501).json({ message: 'Not implemented' });
  },

  async suspendUser(_req: Request, res: Response): Promise<void> {
    res.status(501).json({ message: 'Not implemented' });
  },

  async unsuspendUser(_req: Request, res: Response): Promise<void> {
    res.status(501).json({ message: 'Not implemented' });
  },

  async listTrips(_req: Request, res: Response): Promise<void> {
    res.status(501).json({ message: 'Not implemented' });
  },

  async getTripStats(_req: Request, res: Response): Promise<void> {
    res.status(501).json({ message: 'Not implemented' });
  },

  async getTrip(_req: Request, res: Response): Promise<void> {
    res.status(501).json({ message: 'Not implemented' });
  },
};
