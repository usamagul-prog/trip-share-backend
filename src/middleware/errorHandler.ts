import { Request, Response, NextFunction } from 'express';
import * as Sentry from '@sentry/node';
import logger from '../utils/logger';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  logger.error(err.message, { stack: err.stack, method: req.method, url: req.originalUrl });
  Sentry.captureException(err);
  res.status(500).json({ error: 'Internal server error' });
}
