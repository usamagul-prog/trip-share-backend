import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/auth';
import { validateUpload } from '../../middleware/upload';
import { authController } from './auth.controller';

const registerSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2).max(60),
  role: z.enum(['driver', 'rider']),
  dob: z.string().optional(),
  terms_accepted: z.boolean().optional(),
});

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

const router = Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.get('/me', authenticate, authController.me);
router.put('/fcm-token', authenticate, authController.saveFcmToken);
router.put('/profile', authenticate, validate(z.object({ name: z.string().min(2).max(60) })), authController.updateProfile);
router.post('/avatar', authenticate, validateUpload, authController.uploadAvatar);
router.get('/export', authenticate, authController.exportData);
router.delete('/me', authenticate, authController.deleteAccount);
router.post('/block/:userId', authenticate, authController.blockUser);
router.delete('/block/:userId', authenticate, authController.unblockUser);
router.post('/documents', authenticate, validateUpload, authController.uploadDocument);
router.put('/password', authenticate, validate(z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: z.string().min(8, 'New password must be at least 8 characters'),
})), authController.changePassword);

export default router;
