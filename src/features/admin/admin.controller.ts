import { Request, Response } from 'express';
import { adminService, AdminLoginError, SuspendAdminError } from './admin.service';

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

  async listUsers(req: Request, res: Response): Promise<void> {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Number(req.query.limit) || 20);
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const result = await adminService.listUsers(page, limit, search);
    res.json(result);
  },

  async exportUsers(_req: Request, res: Response): Promise<void> {
    const csv = await adminService.exportUsers();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="users.csv"');
    res.send(csv);
  },

  async getUser(req: Request, res: Response): Promise<void> {
    const user = await adminService.getUser(req.params.id as string);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ user });
  },

  async suspendUser(req: Request, res: Response): Promise<void> {
    const { reason } = req.body as { reason: string };
    try {
      const user = await adminService.suspendUser(req.params.id as string, reason);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      res.json({ user });
    } catch (err) {
      if (err instanceof SuspendAdminError) {
        res.status(400).json({ error: 'Cannot suspend admin accounts' });
        return;
      }
      throw err;
    }
  },

  async unsuspendUser(req: Request, res: Response): Promise<void> {
    const user = await adminService.unsuspendUser(req.params.id as string);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ user });
  },

  async listTrips(req: Request, res: Response): Promise<void> {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Number(req.query.limit) || 20);
    const result = await adminService.listTrips({
      page,
      limit,
      status: typeof req.query.status === 'string' ? req.query.status : undefined,
      origin: typeof req.query.origin === 'string' ? req.query.origin : undefined,
      destination: typeof req.query.destination === 'string' ? req.query.destination : undefined,
      from: typeof req.query.from === 'string' ? req.query.from : undefined,
      to: typeof req.query.to === 'string' ? req.query.to : undefined,
    });
    res.json(result);
  },

  async getTripStats(_req: Request, res: Response): Promise<void> {
    const stats = await adminService.getTripStats();
    res.json(stats);
  },

  async getTrip(req: Request, res: Response): Promise<void> {
    const trip = await adminService.getTrip(req.params.id as string);
    if (!trip) {
      res.status(404).json({ error: 'Trip not found' });
      return;
    }
    res.json({ trip });
  },
};
