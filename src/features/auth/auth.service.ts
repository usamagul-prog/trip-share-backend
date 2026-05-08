import bcrypt from 'bcryptjs';
import { User, IUser } from './User.model';

export class AlreadyRegisteredError extends Error {
  readonly code = 'ALREADY_REGISTERED' as const;
  constructor() {
    super('Email already registered');
    this.name = 'AlreadyRegisteredError';
  }
}

export class InvalidCredentialsError extends Error {
  readonly code = 'INVALID_CREDENTIALS' as const;
  constructor() {
    super('Invalid email or password');
    this.name = 'InvalidCredentialsError';
  }
}

export const authService = {
  async register(
    email: string,
    password: string,
    name: string,
    role: 'driver' | 'rider',
    extras?: { dob?: Date; terms_accepted_at?: Date }
  ): Promise<IUser> {
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) throw new AlreadyRegisteredError();
    const hashed = await bcrypt.hash(password, 12);
    try {
      return await User.create({
        email: email.toLowerCase(),
        password: hashed,
        name,
        role,
        is_verified: true,
        ...extras,
      });
    } catch (err: unknown) {
      if ((err as { code?: number }).code === 11000) throw new AlreadyRegisteredError();
      throw err;
    }
  },

  async login(email: string, password: string): Promise<IUser> {
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user || !user.password) throw new InvalidCredentialsError();
    const match = await bcrypt.compare(password, user.password);
    if (!match) throw new InvalidCredentialsError();
    return user;
  },

  async findUserById(id: string): Promise<IUser | null> {
    return User.findById(id);
  },
};
