import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import { validate } from '../../middleware/validate';
import { bookingsController } from './bookings.controller';

const router = Router();

const rejectBookingSchema = z.object({
  reason: z.string().max(200).optional(),
});

router.put('/:id/accept', authenticate, requireRole('driver'), bookingsController.accept);
router.put('/:id/reject', authenticate, requireRole('driver'), validate(rejectBookingSchema), bookingsController.reject);

// Epic 4 stubs — kept for forward-compatibility
router.post('/', authenticate, bookingsController.create);
router.get('/my', authenticate, bookingsController.myBookings);
router.patch('/:id/status', authenticate, bookingsController.updateStatus);

export default router;
