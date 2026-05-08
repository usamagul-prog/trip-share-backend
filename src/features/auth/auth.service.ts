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
  readonly code: 'INVALID_TOKEN' | 'MISSING_PHONE' | 'INVALID_PHONE';
  constructor(code: 'INVALID_TOKEN' | 'MISSING_PHONE' | 'INVALID_PHONE', message: string) {
    super(message);
    this.name = 'FirebaseTokenError';
    this.code = code;
  }
}

// Pakistani mobile: +92 followed by 10 digits, starting with 3xx
const PK_PHONE_RE = /^\+923\d{9}$/;

export const authService = {
  async verifyFirebaseToken(idToken: string): Promise<string> {
    let decoded;
    try {
      decoded = await getAuth().verifyIdToken(idToken);
    } catch {
      throw new FirebaseTokenError('INVALID_TOKEN', 'Firebase token verification failed');
    }
    if (!decoded.phone_number)
      throw new FirebaseTokenError('MISSING_PHONE', 'Firebase token has no phone_number claim');
    if (!PK_PHONE_RE.test(decoded.phone_number))
      throw new FirebaseTokenError('INVALID_PHONE', 'Enter a valid Pakistani mobile number (+92XXXXXXXXXX)');
    return decoded.phone_number;
  },

  async findOrCreateUser(
    phone: string,
    name: string,
    role: 'driver' | 'rider',
    extras?: { dob?: Date; terms_accepted_at?: Date }
  ): Promise<IUser> {
    const existing = await User.findOne({ phone });
    if (existing) throw new AlreadyRegisteredError();
    try {
      return await User.create({ phone, name, role, is_verified: true, ...extras });
    } catch (err: unknown) {
      if ((err as { code?: number }).code === 11000) throw new AlreadyRegisteredError();
      throw err;
    }
  },

  async findUserByPhone(phone: string): Promise<IUser | null> {
    return User.findOne({ phone });
  },
};
