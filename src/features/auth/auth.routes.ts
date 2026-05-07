import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/auth';
import { authController } from './auth.controller';

const registerSchema = z.object({
  idToken: z.string().min(1),
  name: z.string().min(2).max(60),
  role: z.enum(['driver', 'rider']),
});

const loginSchema = z.object({
  idToken: z.string().min(1),
});

const router = Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.get('/me', authenticate, authController.me);

export default router;
