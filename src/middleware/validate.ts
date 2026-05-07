import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

export function validate(schema: ZodSchema, source: 'body' | 'query' = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const data = source === 'query' ? req.query : req.body;
    const result = schema.safeParse(data);
    if (!result.success) {
      res.status(400).json({
        error: 'Validation error',
        issues: result.error.issues.map((i) => ({ path: i.path, message: i.message })),
      });
      return;
    }
    if (source === 'body') req.body = result.data;
    next();
  };
}
