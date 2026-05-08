jest.mock('../features/auth/auth.service', () => ({
  authService: {
    register: jest.fn(),
    login: jest.fn(),
    findUserById: jest.fn(),
  },
  AlreadyRegisteredError: class AlreadyRegisteredError extends Error {
    code = 'ALREADY_REGISTERED' as const;
    constructor() { super('Email already registered'); this.name = 'AlreadyRegisteredError'; }
  },
  InvalidCredentialsError: class InvalidCredentialsError extends Error {
    code = 'INVALID_CREDENTIALS' as const;
    constructor() { super('Invalid email or password'); this.name = 'InvalidCredentialsError'; }
  },
}));

jest.mock('../features/auth/User.model', () => ({
  User: {
    findById: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: 'user123', name: 'Ali Khan', role: 'rider', status: 'active' }),
      }),
    }),
  },
}));

import request from 'supertest';
import app from '../app';
import { authService } from '../features/auth/auth.service';
import { User } from '../features/auth/User.model';
import { signToken } from '../utils/jwt';

const mockUser = {
  _id: 'user123',
  name: 'Ali Khan',
  email: 'ali@example.com',
  role: 'rider' as const,
  avatar_url: undefined,
};

beforeEach(() => {
  process.env.JWT_SECRET = 'testsecret-32-chars-minimum-len';
  jest.clearAllMocks();
});

describe('POST /api/auth/register', () => {
  it('returns 400 when email is missing', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'Ali', role: 'rider', password: 'pass1234', terms_accepted: true });
    expect(res.status).toBe(400);
  });

  it('returns 400 when password is too short', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'a@b.com', name: 'Ali Khan', role: 'rider', password: 'short', terms_accepted: true });
    expect(res.status).toBe(400);
  });

  it('returns 400 when role is invalid', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'a@b.com', name: 'Ali Khan', role: 'admin', password: 'password123', terms_accepted: true });
    expect(res.status).toBe(400);
  });

  it('returns 201 with token + user on success', async () => {
    (authService.register as jest.Mock).mockResolvedValue(mockUser);

    const res = await request(app).post('/api/auth/register').send({
      email: 'ali@example.com',
      name: 'Ali Khan',
      role: 'rider',
      password: 'password123',
      terms_accepted: true,
    });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.email).toBe('ali@example.com');
    expect(res.body.user.role).toBe('rider');
  });

  it('returns 409 when email already registered', async () => {
    const MockAlreadyRegisteredError = (
      jest.requireMock('../features/auth/auth.service') as {
        AlreadyRegisteredError: new () => Error & { code: string };
      }
    ).AlreadyRegisteredError;
    (authService.register as jest.Mock).mockRejectedValue(new MockAlreadyRegisteredError());

    const res = await request(app).post('/api/auth/register').send({
      email: 'ali@example.com',
      name: 'Ali Khan',
      role: 'rider',
      password: 'password123',
      terms_accepted: true,
    });
    expect(res.status).toBe(409);
  });
});

describe('POST /api/auth/login', () => {
  it('returns 400 when email is missing', async () => {
    const res = await request(app).post('/api/auth/login').send({ password: 'pass' });
    expect(res.status).toBe(400);
  });

  it('returns 401 on invalid credentials', async () => {
    const MockInvalidCredentialsError = (
      jest.requireMock('../features/auth/auth.service') as {
        InvalidCredentialsError: new () => Error;
      }
    ).InvalidCredentialsError;
    (authService.login as jest.Mock).mockRejectedValue(new MockInvalidCredentialsError());

    const res = await request(app).post('/api/auth/login').send({ email: 'ali@example.com', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('returns 200 with token + user on success', async () => {
    (authService.login as jest.Mock).mockResolvedValue(mockUser);

    const res = await request(app).post('/api/auth/login').send({ email: 'ali@example.com', password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.email).toBe('ali@example.com');
  });
});

describe('GET /api/auth/me', () => {
  it('returns 401 with no token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns 200 with user when authenticated', async () => {
    const token = signToken({ _id: 'user123', role: 'rider', email: 'ali@example.com' });
    (User.findById as jest.Mock).mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: 'user123', name: 'Ali Khan', role: 'rider', status: 'active' }),
      }),
    });
    (User.findById as jest.Mock).mockResolvedValueOnce(mockUser);

    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe('Ali Khan');
  });
});
