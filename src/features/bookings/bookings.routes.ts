import { Router } from 'express';
import { bookingsController } from './bookings.controller';

const router = Router();

router.post('/', bookingsController.create);
router.get('/my', bookingsController.myBookings);
router.patch('/:id/status', bookingsController.updateStatus);

export default router;
