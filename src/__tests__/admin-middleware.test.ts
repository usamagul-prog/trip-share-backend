jest.mock('../features/auth/User.model', () => ({
  User: { findById: jest.fn() },
}));
jest.mock('../utils/jwt', () => ({
  verifyToken: jest.fn(),
}));

import { User } from '../features/auth/User.model';
import { verifyToken } from '../utils/jwt';
import { authenticate } from '../middleware/auth';
import { Request, Response, NextFunction } from 'express';

function makeReqResMock(token?: string) {
  const req = {
    headers: { authorization: token ? `Bearer ${token}` : undefined },
  } as unknown as Request;
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  } as unknown as Response;
  const next = jest.fn() as NextFunction;
  return { req, res, next };
}

beforeEach(() => jest.clearAllMocks());

it('calls next() for active users', async () => {
  (verifyToken as jest.Mock).mockReturnValue({ _id: 'u1', role: 'rider', phone: '+1' });
  (User.findById as jest.Mock).mockReturnValue({
    select: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue({ _id: 'u1', name: 'Alice', role: 'rider', status: 'active' }),
    }),
  });
  const { req, res, next } = makeReqResMock('tok');
  await authenticate(req, res, next);
  expect(next).toHaveBeenCalled();
  expect((req as Request & { user?: unknown }).user).toMatchObject({ _id: 'u1', status: 'active' });
});

it('returns 403 for suspended users', async () => {
  (verifyToken as jest.Mock).mockReturnValue({ _id: 'u1', role: 'rider', phone: '+1' });
  (User.findById as jest.Mock).mockReturnValue({
    select: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue({ _id: 'u1', name: 'Bob', role: 'rider', status: 'suspended' }),
    }),
  });
  const { req, res, next } = makeReqResMock('tok');
  await authenticate(req, res, next);
  expect(res.status).toHaveBeenCalledWith(403);
  expect(res.json).toHaveBeenCalledWith({ error: 'Account suspended' });
  expect(next).not.toHaveBeenCalled();
});

it('returns 401 when user not found in DB', async () => {
  (verifyToken as jest.Mock).mockReturnValue({ _id: 'u1', role: 'rider', phone: '+1' });
  (User.findById as jest.Mock).mockReturnValue({
    select: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(null),
    }),
  });
  const { req, res, next } = makeReqResMock('tok');
  await authenticate(req, res, next);
  expect(res.status).toHaveBeenCalledWith(401);
  expect(next).not.toHaveBeenCalled();
});
