import jwt from 'jsonwebtoken';

function getSecret(): string {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET environment variable is not set');
  return s;
}

export function signToken(payload: object): string {
  return jwt.sign(payload, getSecret(), { expiresIn: '7d' });
}

export function verifyToken(token: string): object {
  return jwt.verify(token, getSecret()) as object;
}
