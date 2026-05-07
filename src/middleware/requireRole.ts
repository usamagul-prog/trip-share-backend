import { Request, Response, NextFunction } from 'express';

export function requireRole(...roles: ('driver' | 'rider' | 'admin')[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: 'forbidden' });
      return;
    }
    next();
  };
}
