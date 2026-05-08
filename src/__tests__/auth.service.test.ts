jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed'),
  compare: jest.fn(),
}));

jest.mock('../features/auth/User.model', () => ({
  User: {
    findOne: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
  },
}));

import bcrypt from 'bcryptjs';
import { User } from '../features/auth/User.model';
import { authService, AlreadyRegisteredError, InvalidCredentialsError } from '../features/auth/auth.service';

const mockUser = {
  _id: 'user123',
  name: 'Ali Khan',
  email: 'ali@example.com',
  role: 'rider' as const,
  is_verified: true,
  password: 'hashed',
};

beforeEach(() => jest.clearAllMocks());

describe('authService.register', () => {
  it('creates and returns a new user', async () => {
    (User.findOne as jest.Mock).mockResolvedValue(null);
    (User.create as jest.Mock).mockResolvedValue(mockUser);

    const user = await authService.register('ali@example.com', 'password123', 'Ali Khan', 'rider');
    expect(User.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'ali@example.com', name: 'Ali Khan', role: 'rider', is_verified: true })
    );
    expect(user.name).toBe('Ali Khan');
  });

  it('throws AlreadyRegisteredError when email exists', async () => {
    (User.findOne as jest.Mock).mockResolvedValue(mockUser);

    const err = await authService.register('ali@example.com', 'password123', 'Ali Khan', 'rider').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AlreadyRegisteredError);
    expect((err as AlreadyRegisteredError).code).toBe('ALREADY_REGISTERED');
  });
});

describe('authService.login', () => {
  it('returns user on valid credentials', async () => {
    (User.findOne as jest.Mock).mockReturnValue({ select: jest.fn().mockResolvedValue(mockUser) });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const user = await authService.login('ali@example.com', 'password123');
    expect(user.name).toBe('Ali Khan');
  });

  it('throws InvalidCredentialsError when user not found', async () => {
    (User.findOne as jest.Mock).mockReturnValue({ select: jest.fn().mockResolvedValue(null) });

    const err = await authService.login('nobody@example.com', 'pass').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(InvalidCredentialsError);
  });

  it('throws InvalidCredentialsError when password is wrong', async () => {
    (User.findOne as jest.Mock).mockReturnValue({ select: jest.fn().mockResolvedValue(mockUser) });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    const err = await authService.login('ali@example.com', 'wrongpass').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(InvalidCredentialsError);
  });
});

describe('authService.findUserById', () => {
  it('returns user when found', async () => {
    (User.findById as jest.Mock).mockResolvedValue(mockUser);
    const user = await authService.findUserById('user123');
    expect(user?.name).toBe('Ali Khan');
  });

  it('returns null when not found', async () => {
    (User.findById as jest.Mock).mockResolvedValue(null);
    const user = await authService.findUserById('nonexistent');
    expect(user).toBeNull();
  });
});
