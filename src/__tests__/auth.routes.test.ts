jest.mock('../features/auth/auth.service', () => ({
  authService: {
    verifyFirebaseToken: jest.fn(),
    findOrCreateUser: jest.fn(),
    findUserByPhone: jest.fn(),
  },
  AlreadyRegisteredError: class AlreadyRegisteredError extends Error {
    code = 'ALREADY_REGISTERED' as const;
    constructor() {
      super('Phone already registered');
      this.name = 'AlreadyRegisteredError';
    }
  },
  FirebaseTokenError: class FirebaseTokenError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.name = 'FirebaseTokenError';
      this.code = code;
    }
  },
}));

jest.mock('../features/auth/User.model', () => ({
  User: { findById: jest.fn() },
}));

import request from 'supertest';
import app from '../app';
import { authService } from '../features/auth/auth.service';
import { User } from '../features/auth/User.model';
import { signToken } from '../utils/jwt';

const mockUser = {
  _id: 'user123',
  name: 'Ali Khan',
  phone: '+923001234567',
  role: 'rider' as const,
  avatar_url: undefined,
};

beforeEach(() => {
  process.env.JWT_SECRET = 'testsecret-32-chars-minimum-len';
  jest.clearAllMocks();
});

describe('POST /api/auth/register', () => {
  it('returns 400 when idToken is missing', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'Ali', role: 'rider' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when name is too short', async () => {
    const res = await request(app).post('/api/auth/register').send({ idToken: 'tok', name: 'A', role: 'rider' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when role is invalid', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ idToken: 'tok', name: 'Ali Khan', role: 'admin' });
    expect(res.status).toBe(400);
  });

  it('returns 201 with token + user on success', async () => {
    (authService.verifyFirebaseToken as jest.Mock).mockResolvedValue('+923001234567');
    (authService.findOrCreateUser as jest.Mock).mockResolvedValue(mockUser);

    const res = await request(app).post('/api/auth/register').send({
      idToken: 'valid-firebase-token',
      name: 'Ali Khan',
      role: 'rider',
    });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.phone).toBe('+923001234567');
    expect(res.body.user.role).toBe('rider');
  });

  it('returns 409 when phone already registered', async () => {
    (authService.verifyFirebaseToken as jest.Mock).mockResolvedValue('+923001234567');
    const MockAlreadyRegisteredError = (
      jest.requireMock('../features/auth/auth.service') as {
        AlreadyRegisteredError: new () => Error & { code: string };
      }
    ).AlreadyRegisteredError;
    (authService.findOrCreateUser as jest.Mock).mockRejectedValue(new MockAlreadyRegisteredError());

    const res = await request(app).post('/api/auth/register').send({
      idToken: 'valid-firebase-token',
      name: 'Ali Khan',
      role: 'rider',
    });
    expect(res.status).toBe(409);
  });

  it('returns 401 when Firebase token is invalid', async () => {
    const MockFirebaseTokenError = (
      jest.requireMock('../features/auth/auth.service') as {
        FirebaseTokenError: new (code: string, msg: string) => Error;
      }
    ).FirebaseTokenError;
    (authService.verifyFirebaseToken as jest.Mock).mockRejectedValue(
      new MockFirebaseTokenError('INVALID_TOKEN', 'bad')
    );

    const res = await request(app).post('/api/auth/register').send({
      idToken: 'bad-token',
      name: 'Ali Khan',
      role: 'rider',
    });
    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/login', () => {
  it('returns 400 when idToken is missing', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
  });

  it('returns 404 with not_registered when user does not exist', async () => {
    (authService.verifyFirebaseToken as jest.Mock).mockResolvedValue('+923001234567');
    (authService.findUserByPhone as jest.Mock).mockResolvedValue(null);

    const res = await request(app).post('/api/auth/login').send({ idToken: 'valid' });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('not_registered');
  });

  it('returns 200 with token + user on success', async () => {
    (authService.verifyFirebaseToken as jest.Mock).mockResolvedValue('+923001234567');
    (authService.findUserByPhone as jest.Mock).mockResolvedValue(mockUser);

    const res = await request(app).post('/api/auth/login').send({ idToken: 'valid' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
  });
});

describe('GET /api/auth/me', () => {
  it('returns 401 with no token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns 200 with user when authenticated', async () => {
    const token = signToken({ _id: 'user123', role: 'rider', phone: '+923001234567' });
    (User.findById as jest.Mock).mockResolvedValue(mockUser);

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe('Ali Khan');
  });
});
