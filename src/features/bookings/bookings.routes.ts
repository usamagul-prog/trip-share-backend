import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import { validate } from '../../middleware/validate';
import { bookingsController } from './bookings.controller';

const router = Router();

const createBookingSchema = z.object({
  trip_id:      z.string().min(1),
  pickup_point: z.string().min(2).max(120),
});

const rejectBookingSchema = z.object({
  reason: z.string().max(200).optional(),
});

// /my MUST be before /:id — Express matches in declaration order
router.get('/my', authenticate, requireRole('rider'), bookingsController.myBookings);

router.post('/', authenticate, requireRole('rider'), validate(createBookingSchema), bookingsController.create);
router.put('/:id/accept', authenticate, requireRole('driver'), bookingsController.accept);
router.put('/:id/reject', authenticate, requireRole('driver'), validate(rejectBookingSchema), bookingsController.reject);
router.delete('/:id', authenticate, requireRole('rider'), bookingsController.cancel);

export default router;
