# Add API Route

Scaffold a new Express route end-to-end following TripShare backend conventions.

## Checklist
- [ ] Router file in `src/routes/` (one file per domain)
- [ ] Controller function in `src/controllers/` (thin — validate input, call service, return response)
- [ ] Service function in `src/services/` (all business logic here)
- [ ] Zod schema for request body/query validation in the controller
- [ ] `authenticate` middleware applied if route requires a logged-in user
- [ ] `requireRole('admin')` middleware if admin-only
- [ ] `rateLimiter` applied on public-facing endpoints
- [ ] Correct HTTP status codes (201 for creates, 204 for deletes, 400 bad input, 401 unauth, 403 forbidden, 404 not found)
- [ ] No stack traces or DB internals in error responses
- [ ] Route registered in `src/app.ts`

## Templates

### Router
```typescript
// src/routes/example.routes.ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { rateLimiter } from '../middleware/rateLimiter';
import { createExample, getExample } from '../controllers/example.controller';

const router = Router();
router.get('/:id', getExample);
router.post('/', authenticate, rateLimiter, createExample);
export default router;
```

### Controller
```typescript
// src/controllers/example.controller.ts
import { Request, Response } from 'express';
import { z } from 'zod';
import { exampleService } from '../services/example.service';

const createSchema = z.object({
  name: z.string().min(1),
  value: z.number().positive(),
});

export async function createExample(req: Request, res: Response): Promise<void> {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }
  const result = await exampleService.create(req.user!.id, parsed.data);
  res.status(201).json(result);
}

export async function getExample(req: Request, res: Response): Promise<void> {
  const example = await exampleService.findById(req.params.id);
  if (!example) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json(example);
}
```

### Service
```typescript
// src/services/example.service.ts
import { Example } from '../models/Example';

export const exampleService = {
  async create(userId: string, data: { name: string; value: number }) {
    return Example.create({ ...data, user: userId });
  },

  async findById(id: string) {
    return Example.findById(id).populate('user', 'name avatar rating');
  },
};
```

### Register in app.ts
```typescript
import exampleRoutes from './routes/example.routes';
app.use('/api/examples', exampleRoutes);
```

## Rules
- Never use `any` in controllers or services — always type request data via Zod inference
- Never build Mongoose queries with string interpolation
- Wrap async controller bodies in try/catch only if you need custom error handling; otherwise let the global error handler catch
- `req.user` is set by the `authenticate` middleware — type it as `{ id: string; role: string }`
