import { Request, Response, NextFunction } from 'express';
import { requireRole } from '../middleware/requireRole';
import { AuthPayload } from '../utils/jwt';

function makeReq(user?: AuthPayload): Partial<Request> {
  return { user } as Partial<Request>;
}
function makeRes(): { status: jest.Mock; json: jest.Mock } {
  const res = { status: jest.fn(), json: jest.fn() };
  res.status.mockReturnValue(res);
  return res;
}

describe('requireRole', () => {
  it('calls next() when user has an allowed role', () => {
    const req = makeReq({ _id: 'u1', role: 'driver', email: 'test@demo.com' });
    const res = makeRes();
    const next = jest.fn() as NextFunction;
    requireRole('driver')(req as Request, res as unknown as Response, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 403 when user role is not in allowed list', () => {
    const req = makeReq({ _id: 'u1', role: 'rider', email: 'test@demo.com' });
    const res = makeRes();
    const next = jest.fn() as NextFunction;
    requireRole('driver')(req as Request, res as unknown as Response, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'forbidden' });
  });

  it('returns 403 when req.user is undefined', () => {
    const req = makeReq(undefined);
    const res = makeRes();
    const next = jest.fn() as NextFunction;
    requireRole('driver')(req as Request, res as unknown as Response, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('allows admin when admin is in the allowed list', () => {
    const req = makeReq({ _id: 'u1', role: 'admin', email: 'test@demo.com' });
    const res = makeRes();
    const next = jest.fn() as NextFunction;
    requireRole('driver', 'admin')(req as Request, res as unknown as Response, next);
    expect(next).toHaveBeenCalled();
  });
});
