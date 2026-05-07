import { Request, Response } from 'express';
import {
  bookingsService,
  BookingNotFoundError,
  BookingOwnershipError,
  BookingStatusError,
} from './bookings.service';
import { TripNotFoundError } from '../trips/trips.service';

export const bookingsController = {
  async accept(req: Request, res: Response): Promise<void> {
    try {
      const booking = await bookingsService.acceptBooking(req.params.id as string, req.user!._id);
      res.json({ booking });
    } catch (err) {
      if (err instanceof BookingNotFoundError) {
        res.status(404).json({ error: 'Booking not found' });
      } else if (err instanceof BookingOwnershipError) {
        res.status(403).json({ error: 'forbidden' });
      } else if (err instanceof BookingStatusError) {
        res.status(409).json({ error: err.message });
      } else {
        throw err;
      }
    }
  },

  async reject(req: Request, res: Response): Promise<void> {
    try {
      const booking = await bookingsService.rejectBooking(req.params.id as string, req.user!._id);
      res.json({ booking });
    } catch (err) {
      if (err instanceof BookingNotFoundError) {
        res.status(404).json({ error: 'Booking not found' });
      } else if (err instanceof BookingOwnershipError) {
        res.status(403).json({ error: 'forbidden' });
      } else if (err instanceof BookingStatusError) {
        res.status(409).json({ error: err.message });
      } else {
        throw err;
      }
    }
  },

  async create(req: Request, res: Response): Promise<void> {
    try {
      const booking = await bookingsService.createBooking(
        req.user!._id,
        req.body.trip_id,
        req.body.pickup_point
      );
      res.status(201).json({ booking });
    } catch (err) {
      if (err instanceof TripNotFoundError) {
        res.status(404).json({ error: err.message });
      } else if (err instanceof BookingStatusError) {
        if (err.code === 'SELF_BOOKING') {
          res.status(403).json({ error: err.message });
        } else {
          res.status(409).json({ error: err.message });
        }
      } else if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        (err as { code: number }).code === 11000
      ) {
        res.status(409).json({ error: 'You already have a booking for this trip' });
      } else {
        throw err;
      }
    }
  },

  async myBookings(req: Request, res: Response): Promise<void> {
    const raw = req.query.tab;
    if (raw !== undefined && raw !== 'upcoming' && raw !== 'history') {
      res.status(400).json({ error: 'tab must be "upcoming" or "history"' });
      return;
    }
    const tab = (raw as 'upcoming' | 'history') ?? 'upcoming';
    const bookings = await bookingsService.getMyBookings(req.user!._id, tab);
    res.json({ bookings });
  },

  async cancel(req: Request, res: Response): Promise<void> {
    try {
      const booking = await bookingsService.cancelBooking(req.params.id as string, req.user!._id);
      res.json({ booking });
    } catch (err) {
      if (err instanceof BookingNotFoundError) {
        res.status(404).json({ error: 'Booking not found' });
      } else if (err instanceof BookingOwnershipError) {
        res.status(403).json({ error: 'forbidden' });
      } else if (err instanceof BookingStatusError) {
        res.status(409).json({ error: err.message });
      } else {
        throw err;
      }
    }
  },
};
