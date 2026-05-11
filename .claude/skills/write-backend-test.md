# Write Backend Test

Write a Jest + Supertest integration test for an Express route.

## Checklist
- [ ] Import `app` from `src/app` (not the server — the express app instance)
- [ ] Mock Mongoose models at the model boundary (`jest.mock('../models/ModelName')`)
- [ ] Generate a test JWT with `jwt.sign` using `process.env.JWT_SECRET`
- [ ] Test the success case, the validation failure (400), and the auth failure (401)
- [ ] `afterEach(() => jest.clearAllMocks())` always present
- [ ] No real DB connections in tests — all model methods mocked

## Template

```typescript
// src/__tests__/example.test.ts
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app';
import { Example } from '../models/Example';

jest.mock('../models/Example');

const mockExample = { _id: 'ex123', name: 'Test', value: 42, user: 'user123' };

function makeToken(role: 'rider' | 'driver' | 'admin' = 'rider') {
  return jwt.sign(
    { id: 'user123', role },
    process.env.JWT_SECRET ?? 'test-secret',
    { expiresIn: '1h' }
  );
}

describe('POST /api/examples', () => {
  afterEach(() => jest.clearAllMocks());

  it('creates and returns 201 with valid data', async () => {
    (Example.create as jest.Mock).mockResolvedValue(mockExample);

    const res = await request(app)
      .post('/api/examples')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ name: 'Test', value: 42 });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Test');
  });

  it('returns 400 with missing required field', async () => {
    const res = await request(app)
      .post('/api/examples')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ name: 'Only name, no value' });

    expect(res.status).toBe(400);
  });

  it('returns 401 without auth token', async () => {
    const res = await request(app)
      .post('/api/examples')
      .send({ name: 'Test', value: 42 });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/examples/:id', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns 200 with the example', async () => {
    (Example.findById as jest.Mock).mockReturnValue({
      populate: jest.fn().mockResolvedValue(mockExample),
    });

    const res = await request(app).get('/api/examples/ex123');
    expect(res.status).toBe(200);
    expect(res.body._id).toBe('ex123');
  });

  it('returns 404 when not found', async () => {
    (Example.findById as jest.Mock).mockReturnValue({
      populate: jest.fn().mockResolvedValue(null),
    });

    const res = await request(app).get('/api/examples/doesnotexist');
    expect(res.status).toBe(404);
  });
});
```

## Common Mock Patterns

```typescript
// Chained query (find + populate + sort)
(Model.find as jest.Mock).mockReturnValue({
  populate: jest.fn().mockReturnThis(),
  sort: jest.fn().mockReturnThis(),
  limit: jest.fn().mockResolvedValue([mockDoc]),
});

// findByIdAndUpdate
(Model.findByIdAndUpdate as jest.Mock).mockResolvedValue(updatedDoc);

// findByIdAndDelete
(Model.findByIdAndDelete as jest.Mock).mockResolvedValue(mockDoc);

// countDocuments
(Model.countDocuments as jest.Mock).mockResolvedValue(5);
```
