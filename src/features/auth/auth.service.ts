import { getAuth } from 'firebase-admin/auth';
import { User, IUser } from './User.model';

export const authService = {
  async verifyFirebaseToken(idToken: string): Promise<string> {
    const decoded = await getAuth().verifyIdToken(idToken);
    if (!decoded.phone_number) throw new Error('Firebase token has no phone_number claim');
    return decoded.phone_number;
  },

  async findOrCreateUser(
    phone: string,
    name: string,
    role: 'driver' | 'rider'
  ): Promise<IUser> {
    const existing = await User.findOne({ phone });
    if (existing) {
      throw Object.assign(new Error('Phone already registered'), { code: 'ALREADY_REGISTERED' });
    }
    return User.create({ phone, name, role, is_verified: true });
  },

  async findUserByPhone(phone: string): Promise<IUser | null> {
    return User.findOne({ phone });
  },
};
