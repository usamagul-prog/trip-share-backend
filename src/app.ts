import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mongoSanitize = require('express-mongo-sanitize');
import authRouter from './features/auth/auth.routes';
import tripsRouter from './features/trips/trips.routes';
import bookingsRouter from './features/bookings/bookings.routes';
import reviewsRouter from './features/reviews/reviews.routes';
import notificationsRouter from './features/notifications/notifications.routes';
import adminRouter from './features/admin/admin.routes';
import chatRouter from './features/chat/chat.routes';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';

const app = express();

const skip = () => process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip,
  message: { error: 'Too many requests, please try again later.' },
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip,
  message: { error: 'Too many requests, please try again later.' },
});

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(cookieParser());
app.use(requestLogger);
app.use(express.json({ limit: '1mb' }));
// express-mongo-sanitize is incompatible with Express 5 (req.query is read-only)
app.use((req: Request, _res: Response, next: NextFunction) => {
  if (req.body && typeof req.body === 'object') {
    req.body = mongoSanitize.sanitize(req.body, { replaceWith: '_' });
  }
  next();
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authLimiter, authRouter);
app.use('/api/trips', generalLimiter, tripsRouter);
app.use('/api/bookings', generalLimiter, bookingsRouter);
app.use('/api/reviews', generalLimiter, reviewsRouter);
app.use('/api/notifications', generalLimiter, notificationsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/chat', generalLimiter, chatRouter);

app.use((_req: express.Request, res: express.Response) => {
  res.status(404).json({ error: 'Not found' });
});

app.use(errorHandler);

export default app;
