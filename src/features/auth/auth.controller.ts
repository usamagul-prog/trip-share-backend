import { Request, Response } from 'express';
import { authService, AlreadyRegisteredError, FirebaseTokenError } from './auth.service';
import { signToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt';
import { User, IUser } from './User.model';
import { Trip } from '../trips/Trip.model';
import { Booking } from '../bookings/Booking.model';
import { Review } from '../reviews/Review.model';
import { Message } from '../chat/Message.model';
import { RegisterInput, LoginInput } from './auth.routes';
import cloudinary from '../../config/cloudinary';

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

const REFRESH_COOKIE = 'refresh_token';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
};

async function issueTokens(res: Response, user: IUser): Promise<string> {
  const payload = { _id: String(user._id), role: user.role, phone: user.phone };
  const accessToken = signToken(payload);
  const refreshToken = signRefreshToken(payload);
  await User.findByIdAndUpdate(user._id, { refresh_token: refreshToken });
  res.cookie(REFRESH_COOKIE, refreshToken, COOKIE_OPTIONS);
  return accessToken;
}

export const authController = {
  async register(req: Request, res: Response): Promise<void> {
    const { idToken, name, role, dob, terms_accepted } = req.body as RegisterInput;

    // Terms must be accepted by everyone
    if (!terms_accepted) {
      res.status(400).json({ error: 'You must accept the Terms of Service to register.' });
      return;
    }

    // Age verification: drivers must be 18+
    if (role === 'driver') {
      if (!dob) {
        res.status(400).json({ error: 'Date of birth is required for driver registration.' });
        return;
      }
      const birthDate = new Date(dob);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear() -
        (today < new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate()) ? 1 : 0);
      if (age < 18) {
        res.status(400).json({ error: 'You must be at least 18 years old to register as a driver.' });
        return;
      }
    }

    let phone: string;
    try {
      phone = await authService.verifyFirebaseToken(idToken);
    } catch (err) {
      if (err instanceof FirebaseTokenError) {
        const msg = err.code === 'INVALID_PHONE' ? err.message : 'Firebase token verification failed';
        res.status(401).json({ error: msg });
        return;
      }
      throw err; // unexpected errors go to global handler
    }

    const extras = {
      terms_accepted_at: new Date(),
      ...(dob ? { dob: new Date(dob) } : {}),
    };

    try {
      const user = await authService.findOrCreateUser(phone, name, role, extras);
      const token = await issueTokens(res, user);
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
    const { idToken } = req.body as LoginInput;

    let phone: string;
    try {
      phone = await authService.verifyFirebaseToken(idToken);
    } catch (err) {
      if (err instanceof FirebaseTokenError) {
        const msg = err.code === 'INVALID_PHONE' ? err.message : 'Firebase token verification failed';
        res.status(401).json({ error: msg });
        return;
      }
      throw err; // unexpected errors go to global handler
    }

    const user = await authService.findUserByPhone(phone);
    if (!user) {
      res.status(404).json({ error: 'not_registered' });
      return;
    }

    const token = await issueTokens(res, user);
    res.json({ token, user: toPublicUser(user) });
  },

  async me(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }
    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ user: toPublicUser(user) });
  },

  async saveFcmToken(req: Request, res: Response): Promise<void> {
    const { token } = req.body as { token: string };
    if (!token) {
      res.status(400).json({ error: 'token is required' });
      return;
    }
    await User.findByIdAndUpdate(req.user!._id, { fcm_token: token });
    res.status(204).end();
  },

  async updateProfile(req: Request, res: Response): Promise<void> {
    const { name } = req.body as { name: string };
    const user = await User.findByIdAndUpdate(req.user!._id, { name }, { new: true });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    res.json({ user: toPublicUser(user) });
  },

  async uploadAvatar(req: Request, res: Response): Promise<void> {
    const file = req.uploadedFile;
    if (!file) { res.status(400).json({ error: 'No file provided' }); return; }

    const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { folder: 'tripshare/avatars', resource_type: 'image', transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }] },
        (err, result) => {
          if (err || !result) return reject(err ?? new Error('Upload failed'));
          resolve(result as { secure_url: string });
        },
      ).end(file.data);
    });

    const user = await User.findByIdAndUpdate(req.user!._id, { avatar_url: result.secure_url }, { new: true });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    res.json({ user: toPublicUser(user) });
  },

  async deleteAccount(req: Request, res: Response): Promise<void> {
    const userId = req.user!._id;
    await Booking.deleteMany({ rider: userId });
    await Trip.deleteMany({ driver: userId });
    await User.findByIdAndDelete(userId);
    res.status(204).end();
  },

  async refresh(req: Request, res: Response): Promise<void> {
    const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (!token) {
      res.status(401).json({ error: 'No refresh token' });
      return;
    }

    let payload;
    try {
      payload = verifyRefreshToken(token);
    } catch {
      res.status(401).json({ error: 'Invalid or expired refresh token' });
      return;
    }

    const user = await User.findById(payload._id);
    if (!user || user.refresh_token !== token) {
      res.status(401).json({ error: 'Refresh token revoked' });
      return;
    }

    const newAccessToken = await issueTokens(res, user);
    res.json({ token: newAccessToken });
  },

  async exportData(req: Request, res: Response): Promise<void> {
    const userId = req.user!._id;
    const [user, trips, bookings, reviews, messages] = await Promise.all([
      User.findById(userId).select('-refresh_token -fcm_token'),
      Trip.find({ driver: userId }),
      Booking.find({ rider: userId }),
      Review.find({ reviewer: userId }),
      Message.find({ sender: userId }),
    ]);

    const filename = `tripshare-data-${userId}.json`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/json');
    res.json({ user, trips, bookings, reviews, messages, exported_at: new Date() });
  },

  async blockUser(req: Request, res: Response): Promise<void> {
    const currentUserId = req.user!._id;
    const { userId } = req.params;
    if (currentUserId === userId) {
      res.status(400).json({ error: 'Cannot block yourself' });
      return;
    }
    await User.findByIdAndUpdate(currentUserId, { $addToSet: { blocked_users: userId } });
    res.status(204).end();
  },

  async unblockUser(req: Request, res: Response): Promise<void> {
    const currentUserId = req.user!._id;
    const { userId } = req.params;
    await User.findByIdAndUpdate(currentUserId, { $pull: { blocked_users: userId } });
    res.status(204).end();
  },

  async uploadDocument(req: Request, res: Response): Promise<void> {
    const userId = req.user!._id;
    const type = (req.body as Record<string, string>).type;
    if (!['cnic', 'license'].includes(type)) {
      res.status(400).json({ error: 'type must be cnic or license' });
      return;
    }
    const file = req.uploadedFile!;
    const b64 = `data:${file.mimeType};base64,${file.data.toString('base64')}`;
    const result = await cloudinary.uploader.upload(b64, {
      folder: `tripshare/documents/${userId}`,
      public_id: type,
      resource_type: 'image',
      transformation: [{ quality: 'auto', fetch_format: 'auto' }],
    });
    const field = type === 'cnic' ? 'cnic_url' : 'license_url';
    const update: Record<string, unknown> = { [field]: result.secure_url };
    const user = await User.findById(userId).select('cnic_url license_url doc_status');
    if (user) {
      const otherField = type === 'cnic' ? user.license_url : user.cnic_url;
      if (otherField) update.doc_status = 'pending';
    }
    await User.findByIdAndUpdate(userId, update);
    res.json({ url: result.secure_url });
  },

  async logout(req: Request, res: Response): Promise<void> {
    const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (token) {
      try {
        const payload = verifyRefreshToken(token);
        await User.findByIdAndUpdate(payload._id, { refresh_token: null });
      } catch {
        // token invalid — clear anyway
      }
    }
    res.clearCookie(REFRESH_COOKIE, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' });
    res.status(204).end();
  },
};
