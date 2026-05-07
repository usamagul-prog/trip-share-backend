import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  const token = header.slice(7);
  try {
    const payload = verifyToken(token) as {
      _id: string;
      role: 'driver' | 'rider' | 'admin';
      phone: string;
    };
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'unauthorized' });
  }
}
