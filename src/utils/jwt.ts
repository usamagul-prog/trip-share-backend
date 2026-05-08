import jwt, { JwtPayload } from 'jsonwebtoken';

export interface AuthPayload {
  _id: string;
  role: 'driver' | 'rider' | 'admin';
  phone: string;
}

export interface AdminPayload {
  role: 'admin';
}

function getSecret(): string {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET environment variable is not set');
  return s;
}

export function signToken(payload: object): string {
  return jwt.sign(payload, getSecret(), { expiresIn: '7d' });
}

export function verifyToken(token: string): AuthPayload {
  const decoded = jwt.verify(token, getSecret());
  if (typeof decoded === 'string') throw new Error('Invalid token payload');
  const p = decoded as JwtPayload;
  if (typeof p._id !== 'string' || typeof p.phone !== 'string' || !['driver', 'rider', 'admin'].includes(p.role as string)) {
    throw new Error('Invalid token payload shape');
  }
  return { _id: p._id, role: p.role as AuthPayload['role'], phone: p.phone };
}

export function signAdminToken(): string {
  return jwt.sign({ role: 'admin' }, getSecret(), { expiresIn: '2h' });
}

export function verifyAdminToken(token: string): AdminPayload {
  const decoded = jwt.verify(token, getSecret());
  if (typeof decoded === 'string') throw new Error('Invalid token payload');
  const p = decoded as JwtPayload;
  if (p.role !== 'admin') throw new Error('Not an admin token');
  return { role: 'admin' };
}
