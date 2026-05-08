jest.mock('../features/auth/User.model', () => ({
  User: { findById: jest.fn() },
}));

import { authenticate } from '../middleware/auth';
import { signToken } from '../utils/jwt';
import { User } from '../features/auth/User.model';
import { Request, Response } from 'express';

function makeActiveUserMock(overrides?: object) {
  const doc = { _id: 'user1', name: 'Test', role: 'rider', status: 'active', ...overrides };
  (User.findById as jest.Mock).mockReturnValue({
    select: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(doc),
    }),
  });
}

describe('authenticate middleware', () => {
  const next = jest.fn();

  function makeRes() {
    const res = {
      status: jest.fn(),
      json: jest.fn(),
    };
    res.status.mockReturnValue(res);
    return res as unknown as Response;
  }

  beforeEach(() => {
    process.env.JWT_SECRET = 'testsecret-32-chars-minimum-len';
    next.mockClear();
    jest.clearAllMocks();
  });

  afterAll(() => { delete process.env.JWT_SECRET; });

  it('returns 401 with no Authorization header', async () => {
    const req = { headers: {} } as Request;
    const res = makeRes();
    await authenticate(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'unauthorized' });
  });

  it('returns 401 with non-Bearer Authorization', async () => {
    const req = { headers: { authorization: 'Basic abc' } } as unknown as Request;
    const res = makeRes();
    await authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('attaches req.user and calls next() with valid JWT', async () => {
    const token = signToken({ _id: 'user1', role: 'rider', email: 'test@demo.com' });
    const req = { headers: { authorization: `Bearer ${token}` } } as unknown as Request;
    const res = makeRes();
    makeActiveUserMock();
    await authenticate(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(req.user!._id).toBe('user1');
    expect(req.user!.role).toBe('rider');
  });

  it('returns 401 with expired/invalid token', async () => {
    const req = { headers: { authorization: 'Bearer not.a.token' } } as unknown as Request;
    const res = makeRes();
    await authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
