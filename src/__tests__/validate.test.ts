import { validate } from '../middleware/validate';
import { z } from 'zod';
import { Request, Response } from 'express';

const schema = z.object({ name: z.string().min(2) });

describe('validate middleware', () => {
  const next = jest.fn();

  function makeRes() {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;
    return res;
  }

  beforeEach(() => { next.mockClear(); });

  it('calls next() with valid body', () => {
    const req = { body: { name: 'Ali' } } as Request;
    validate(schema)(req, makeRes(), next);
    expect(next).toHaveBeenCalled();
  });

  it('replaces req.body with parsed data', () => {
    const req = { body: { name: 'Ali', extra: 'stripped' } } as Request;
    validate(schema)(req, makeRes(), next);
    expect(req.body).toEqual({ name: 'Ali' });
  });

  it('returns 400 with issues when body is invalid', () => {
    const req = { body: { name: 'X' } } as Request;
    const res = makeRes();
    validate(schema)(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect((res.json as jest.Mock).mock.calls[0][0]).toMatchObject({
      error: 'Validation error',
    });
    expect(next).not.toHaveBeenCalled();
  });
});
