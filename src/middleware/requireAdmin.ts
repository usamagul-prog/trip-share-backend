import { Request, Response, NextFunction } from 'express';
import { verifyAdminToken } from '../utils/jwt';

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const token = header.slice(7);
  try {
    verifyAdminToken(token);
    req.adminRole = 'admin';
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}
