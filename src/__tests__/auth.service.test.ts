// Mock firebase-admin/auth before any imports
jest.mock('firebase-admin/auth', () => ({
  getAuth: jest.fn(),
}));

// Mock User model
jest.mock('../features/auth/User.model', () => ({
  User: {
    findOne: jest.fn(),
    create: jest.fn(),
  },
}));

import { getAuth } from 'firebase-admin/auth';
import { User } from '../features/auth/User.model';
import { authService, AlreadyRegisteredError, FirebaseTokenError } from '../features/auth/auth.service';

const mockUser = {
  _id: 'user123',
  name: 'Ali Khan',
  phone: '+923001234567',
  role: 'rider' as const,
  is_verified: true,
  avatar_url: undefined,
};

beforeEach(() => jest.clearAllMocks());

describe('authService.verifyFirebaseToken', () => {
  it('returns phone_number from verified token', async () => {
    (getAuth as jest.Mock).mockReturnValue({
      verifyIdToken: jest.fn().mockResolvedValue({ phone_number: '+923001234567' }),
    });
    const phone = await authService.verifyFirebaseToken('valid-id-token');
    expect(phone).toBe('+923001234567');
  });

  it('throws when token has no phone_number', async () => {
    (getAuth as jest.Mock).mockReturnValue({
      verifyIdToken: jest.fn().mockResolvedValue({}),
    });
    const err = await authService.verifyFirebaseToken('token-no-phone').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(FirebaseTokenError);
    expect((err as FirebaseTokenError).code).toBe('MISSING_PHONE');
    expect((err as FirebaseTokenError).message).toMatch('phone_number');
  });

  it('throws INVALID_TOKEN when Firebase SDK rejects', async () => {
    (getAuth as jest.Mock).mockReturnValue({
      verifyIdToken: jest.fn().mockRejectedValue(new Error('Firebase: token expired')),
    });
    const err = await authService.verifyFirebaseToken('bad-token').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(FirebaseTokenError);
    expect((err as FirebaseTokenError).code).toBe('INVALID_TOKEN');
  });
});

describe('authService.findOrCreateUser', () => {
  it('creates and returns a new user', async () => {
    (User.findOne as jest.Mock).mockResolvedValue(null);
    (User.create as jest.Mock).mockResolvedValue(mockUser);

    const user = await authService.findOrCreateUser('+923001234567', 'Ali Khan', 'rider');
    expect(User.create).toHaveBeenCalledWith(
      expect.objectContaining({ phone: '+923001234567', name: 'Ali Khan', role: 'rider', is_verified: true })
    );
    expect(user.name).toBe('Ali Khan');
  });

  it('throws ALREADY_REGISTERED when phone exists', async () => {
    (User.findOne as jest.Mock).mockResolvedValue(mockUser);

    const err = await authService
      .findOrCreateUser('+923001234567', 'Ali Khan', 'rider')
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AlreadyRegisteredError);
    expect((err as AlreadyRegisteredError).code).toBe('ALREADY_REGISTERED');
  });
});

describe('authService.findUserByPhone', () => {
  it('returns user when found', async () => {
    (User.findOne as jest.Mock).mockResolvedValue(mockUser);
    const user = await authService.findUserByPhone('+923001234567');
    expect(user?.name).toBe('Ali Khan');
  });

  it('returns null when not found', async () => {
    (User.findOne as jest.Mock).mockResolvedValue(null);
    const user = await authService.findUserByPhone('+923009999999');
    expect(user).toBeNull();
  });
});
