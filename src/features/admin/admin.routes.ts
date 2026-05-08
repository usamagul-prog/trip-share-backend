import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAdmin } from '../../middleware/requireAdmin';
import { adminController } from './admin.controller';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many login attempts. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth
router.post('/auth/login', loginLimiter, adminController.login);

// Users — /export MUST be before /:id
router.get('/users/export', requireAdmin, adminController.exportUsers);
router.get('/users', requireAdmin, adminController.listUsers);
router.get('/users/:id', requireAdmin, adminController.getUser);
router.put('/users/:id/suspend', requireAdmin, adminController.suspendUser);
router.put('/users/:id/unsuspend', requireAdmin, adminController.unsuspendUser);

// Trips — /stats MUST be before /:id
router.get('/trips/stats', requireAdmin, adminController.getTripStats);
router.get('/trips', requireAdmin, adminController.listTrips);
router.get('/trips/:id', requireAdmin, adminController.getTrip);

export default router;
