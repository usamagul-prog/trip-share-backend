import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET as string;

export function signToken(payload: object): string {
  return jwt.sign(payload, SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): object {
  return jwt.verify(token, SECRET) as object;
}
