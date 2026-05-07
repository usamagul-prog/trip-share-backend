import { Request, Response, NextFunction } from 'express';

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  // TODO: verify JWT, attach req.user
  next();
}
