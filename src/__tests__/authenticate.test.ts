import { authenticate } from '../middleware/auth';
import { signToken } from '../utils/jwt';
import { Request, Response } from 'express';

describe('authenticate middleware', () => {
  const next = jest.fn();

  function makeRes() {
    return {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;
  }

  beforeEach(() => {
    process.env.JWT_SECRET = 'testsecret-32-chars-minimum-len';
    next.mockClear();
  });

  afterAll(() => { delete process.env.JWT_SECRET; });

  it('returns 401 with no Authorization header', () => {
    const req = { headers: {} } as Request;
    authenticate(req, makeRes(), next);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 with non-Bearer Authorization', () => {
    const req = { headers: { authorization: 'Basic abc' } } as unknown as Request;
    const res = makeRes();
    authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('attaches req.user and calls next() with valid JWT', () => {
    const token = signToken({ _id: 'user1', role: 'rider', phone: '+923001234567' });
    const req = { headers: { authorization: `Bearer ${token}` } } as unknown as Request;
    authenticate(req, makeRes(), next);
    expect(next).toHaveBeenCalled();
    expect((req as any).user._id).toBe('user1');
    expect((req as any).user.role).toBe('rider');
  });

  it('returns 401 with expired/invalid token', () => {
    const req = { headers: { authorization: 'Bearer not.a.token' } } as unknown as Request;
    const res = makeRes();
    authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
