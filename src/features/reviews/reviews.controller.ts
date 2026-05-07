import { Request, Response } from 'express';
import { z } from 'zod';
import { reviewsService, ReviewError, ReviewParticipantError } from './reviews.service';

const createReviewSchema = z.object({
  booking_id: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
});

const getReviewsSchema = z.object({
  userId: z.string().min(1),
  type: z.enum(['received', 'given']),
});

export const reviewsController = {
  async create(req: Request, res: Response): Promise<void> {
    const parsed = createReviewSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Validation error',
        issues: parsed.error.issues.map((i) => ({ path: i.path, message: i.message })),
      });
      return;
    }

    const { booking_id, rating, comment } = parsed.data;

    try {
      const review = await reviewsService.createReview(
        req.user!._id,
        booking_id,
        rating,
        comment
      );
      res.status(201).json({ review });
    } catch (err) {
      if (err instanceof ReviewParticipantError) {
        res.status(403).json({ error: err.message });
      } else if (err instanceof ReviewError) {
        if (err.code === 'BOOKING_NOT_FOUND') {
          res.status(404).json({ error: err.message });
        } else {
          res.status(409).json({ error: err.message, code: err.code });
        }
      } else if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        (err as { code: number }).code === 11000
      ) {
        res.status(409).json({ error: 'You already reviewed this trip', code: 'DUPLICATE_REVIEW' });
      } else {
        throw err;
      }
    }
  },

  async forUser(req: Request, res: Response): Promise<void> {
    const parsed = getReviewsSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Validation error',
        issues: parsed.error.issues.map((i) => ({ path: i.path, message: i.message })),
      });
      return;
    }

    const { userId, type } = parsed.data;
    const reviews = await reviewsService.getReviewsForUser(userId, type);
    res.json({ reviews });
  },
};
