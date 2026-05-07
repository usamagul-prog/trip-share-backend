import { Request, Response } from 'express';
import {
  tripsService,
  TripNotFoundError,
  TripOwnershipError,
  TripStatusError,
} from './trips.service';

export const tripsController = {
  async create(req: Request, res: Response): Promise<void> {
    try {
      const trip = await tripsService.createTrip(req.user!._id, req.body);
      res.status(201).json({ trip });
    } catch (err) {
      if (err instanceof TripStatusError && err.code === 'DEPARTURE_TOO_SOON') {
        res.status(400).json({ error: err.message });
      } else {
        throw err;
      }
    }
  },

  async getMyTrips(req: Request, res: Response): Promise<void> {
    const status = (req.query.status as 'scheduled' | 'completed' | 'cancelled') || 'scheduled';
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await tripsService.getMyTrips(req.user!._id, status, page, limit);
    res.json(result);
  },

  async getOne(req: Request, res: Response): Promise<void> {
    try {
      const trip = await tripsService.getTripById(req.params.id as string, req.user!._id);
      res.json({ trip });
    } catch (err) {
      if (err instanceof TripNotFoundError) {
        res.status(404).json({ error: 'Trip not found' });
      } else {
        throw err;
      }
    }
  },

  async update(req: Request, res: Response): Promise<void> {
    try {
      const trip = await tripsService.updateTrip(req.params.id as string, req.user!._id, req.body);
      res.json({ trip });
    } catch (err) {
      if (err instanceof TripNotFoundError) {
        res.status(404).json({ error: 'Trip not found' });
      } else if (err instanceof TripOwnershipError) {
        res.status(403).json({ error: 'forbidden' });
      } else if (err instanceof TripStatusError && err.code === 'HAS_CONFIRMED_BOOKINGS') {
        res.status(409).json({ error: err.message });
      } else if (err instanceof TripStatusError && err.code === 'DEPARTURE_TOO_SOON') {
        res.status(400).json({ error: err.message });
      } else {
        throw err;
      }
    }
  },

  async cancel(req: Request, res: Response): Promise<void> {
    try {
      const trip = await tripsService.cancelTrip(req.params.id as string, req.user!._id);
      res.json({ trip });
    } catch (err) {
      if (err instanceof TripNotFoundError) {
        res.status(404).json({ error: 'Trip not found' });
      } else if (err instanceof TripOwnershipError) {
        res.status(403).json({ error: 'forbidden' });
      } else if (err instanceof TripStatusError) {
        res.status(409).json({ error: err.message });
      } else {
        throw err;
      }
    }
  },

  async complete(req: Request, res: Response): Promise<void> {
    try {
      const trip = await tripsService.completeTrip(req.params.id as string, req.user!._id);
      res.json({ trip });
    } catch (err) {
      if (err instanceof TripNotFoundError) {
        res.status(404).json({ error: 'Trip not found' });
      } else if (err instanceof TripOwnershipError) {
        res.status(403).json({ error: 'forbidden' });
      } else if (err instanceof TripStatusError) {
        res.status(409).json({ error: err.message });
      } else {
        throw err;
      }
    }
  },

  async search(req: Request, res: Response): Promise<void> {
    const { from, to, date } = req.query as { from: string; to: string; date: string };
    const trips = await tripsService.searchTrips(from, to, date);
    res.json({ trips });
  },
};
