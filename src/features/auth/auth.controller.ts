import { Request, Response } from 'express';
import { authService, AlreadyRegisteredError, FirebaseTokenError } from './auth.service';
import { signToken } from '../../utils/jwt';
import { User, IUser } from './User.model';

type PublicUser = {
  _id: string;
  name: string;
  phone: string;
  role: string;
  avatar_url: string | null;
};

function toPublicUser(user: IUser): PublicUser {
  return {
    _id: String(user._id),
    name: user.name,
    phone: user.phone,
    role: user.role,
    avatar_url: user.avatar_url ?? null,
  };
}

export const authController = {
  async register(req: Request, res: Response): Promise<void> {
    const { idToken, name, role } = req.body as {
      idToken: string;
      name: string;
      role: 'driver' | 'rider';
    };

    let phone: string;
    try {
      phone = await authService.verifyFirebaseToken(idToken);
    } catch (err) {
      if (err instanceof FirebaseTokenError) {
        res.status(401).json({ error: 'Firebase token verification failed' });
      } else {
        res.status(401).json({ error: 'Firebase token verification failed' });
      }
      return;
    }

    try {
      const user = await authService.findOrCreateUser(phone, name, role);
      const token = signToken({ _id: String(user._id), role: user.role, phone: user.phone });
      res.status(201).json({ token, user: toPublicUser(user) });
    } catch (err) {
      if (err instanceof AlreadyRegisteredError) {
        res.status(409).json({ error: 'Phone already registered. Please login instead.' });
        return;
      }
      throw err;
    }
  },

  async login(req: Request, res: Response): Promise<void> {
    const { idToken } = req.body as { idToken: string };

    let phone: string;
    try {
      phone = await authService.verifyFirebaseToken(idToken);
    } catch {
      res.status(401).json({ error: 'Firebase token verification failed' });
      return;
    }

    const user = await authService.findUserByPhone(phone);
    if (!user) {
      res.status(404).json({ error: 'not_registered' });
      return;
    }

    const token = signToken({ _id: String(user._id), role: user.role, phone: user.phone });
    res.json({ token, user: toPublicUser(user) });
  },

  async me(req: Request, res: Response): Promise<void> {
    const user = await User.findById(req.user!._id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ user: toPublicUser(user) });
  },
};
