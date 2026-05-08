jest.mock('../utils/jwt', () => ({
  verifyAdminToken: jest.fn(),
}));

import { verifyAdminToken } from '../utils/jwt';
import { requireAdmin } from '../middleware/requireAdmin';
import { Request, Response, NextFunction } from 'express';

function makeReqResMock(token?: string) {
  const req = { headers: { authorization: token ? `Bearer ${token}` : undefined } } as unknown as Request;
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
  const next = jest.fn() as NextFunction;
  return { req, res, next };
}

beforeEach(() => jest.clearAllMocks());

it('calls next() for valid admin token', () => {
  (verifyAdminToken as jest.Mock).mockReturnValue({ role: 'admin' });
  const { req, res, next } = makeReqResMock('valid-token');
  requireAdmin(req, res, next);
  expect(next).toHaveBeenCalled();
  expect((req as Request & { adminRole?: string }).adminRole).toBe('admin');
});

it('returns 401 when no token', () => {
  const { req, res, next } = makeReqResMock();
  requireAdmin(req, res, next);
  expect(res.status).toHaveBeenCalledWith(401);
  expect(next).not.toHaveBeenCalled();
});

it('returns 401 when token is invalid', () => {
  (verifyAdminToken as jest.Mock).mockImplementation(() => { throw new Error('invalid'); });
  const { req, res, next } = makeReqResMock('bad-token');
  requireAdmin(req, res, next);
  expect(res.status).toHaveBeenCalledWith(401);
  expect(next).not.toHaveBeenCalled();
});
