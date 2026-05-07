import { getAuth } from 'firebase-admin/auth';
import { User, IUser } from './User.model';

export class AlreadyRegisteredError extends Error {
  readonly code = 'ALREADY_REGISTERED' as const;
  constructor() {
    super('Phone already registered');
    this.name = 'AlreadyRegisteredError';
  }
}

export class FirebaseTokenError extends Error {
  readonly code: 'INVALID_TOKEN' | 'MISSING_PHONE';
  constructor(code: 'INVALID_TOKEN' | 'MISSING_PHONE', message: string) {
    super(message);
    this.name = 'FirebaseTokenError';
    this.code = code;
  }
}

export const authService = {
  async verifyFirebaseToken(idToken: string): Promise<string> {
    const decoded = await getAuth().verifyIdToken(idToken);
    if (!decoded.phone_number)
      throw new FirebaseTokenError('MISSING_PHONE', 'Firebase token has no phone_number claim');
    return decoded.phone_number;
  },

  async findOrCreateUser(
    phone: string,
    name: string,
    role: 'driver' | 'rider'
  ): Promise<IUser> {
    const existing = await User.findOne({ phone });
    if (existing) throw new AlreadyRegisteredError();
    try {
      return await User.create({ phone, name, role, is_verified: true });
    } catch (err: unknown) {
      if ((err as { code?: number }).code === 11000) throw new AlreadyRegisteredError();
      throw err;
    }
  },

  async findUserByPhone(phone: string): Promise<IUser | null> {
    return User.findOne({ phone });
  },
};
