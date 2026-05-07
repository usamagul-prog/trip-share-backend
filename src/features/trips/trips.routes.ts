import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import { validate } from '../../middleware/validate';
import { tripsController } from './trips.controller';

const router = Router();

const searchTripsSchema = z.object({
  from: z.string().min(2).max(60),
  to:   z.string().min(2).max(60),
  date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD')
    .refine((d) => !isNaN(new Date(d).getTime()), 'Invalid date'),
});

const createTripSchema = z.object({
  origin:         z.string().min(2).max(60),
  destination:    z.string().min(2).max(60),
  departure_time: z.string().datetime(),
  seats_total:    z.number().int().min(1).max(4),
  fare:           z.number().int().min(1).max(50000),
  vehicle_desc:   z.string().max(100).optional(),
  waypoints:      z.array(z.string().min(2).max(60)).max(5).optional(),
});

const updateTripSchema = z
  .object({
    fare:           z.number().int().min(1).max(50000).optional(),
    departure_time: z.string().datetime().optional(),
    seats_total:    z.number().int().min(1).max(4).optional(),
    vehicle_desc:   z.string().max(100).optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, { message: 'At least one field required' });

// /search and /my-trips MUST be before /:id — Express matches in declaration order
router.get('/search', authenticate, validate(searchTripsSchema, 'query'), tripsController.search);
router.get('/my-trips', authenticate, requireRole('driver'), tripsController.getMyTrips);

router.post('/', authenticate, requireRole('driver'), validate(createTripSchema), tripsController.create);
router.get('/:id', authenticate, tripsController.getOne);
router.put('/:id', authenticate, requireRole('driver'), validate(updateTripSchema), tripsController.update);
router.patch('/:id/cancel', authenticate, requireRole('driver'), tripsController.cancel);
router.put('/:id/complete', authenticate, requireRole('driver'), tripsController.complete);

export default router;
