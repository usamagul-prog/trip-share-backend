import { Request, Response } from 'express';
import {
  bookingsService,
  BookingNotFoundError,
  BookingOwnershipError,
  BookingStatusError,
} from './bookings.service';

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

  async create(_req: Request, res: Response): Promise<void> {
    res.status(501).json({ message: 'Not implemented — Epic 4' });
  },

  async myBookings(_req: Request, res: Response): Promise<void> {
    res.status(501).json({ message: 'Not implemented — Epic 4' });
  },

  async updateStatus(_req: Request, res: Response): Promise<void> {
    res.status(501).json({ message: 'Not implemented — Epic 4' });
  },
};
