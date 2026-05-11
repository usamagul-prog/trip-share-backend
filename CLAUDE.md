# TripShare Backend — Claude Code Instructions

## Stack
Express 5 · TypeScript 6 · MongoDB (Mongoose) · Firebase Admin · Socket.io · JWT · Cloudinary · Zod · Resend

## Commands
- `npm start` — ts-node dev server
- `npm test` — Jest + Supertest
- `npm run build` — tsc production build

## Architecture
- `src/routes/` — Express routers, one file per domain
- `src/controllers/` — Thin route handlers, delegate to services
- `src/services/` — Business logic
- `src/models/` — Mongoose schemas + TypeScript interfaces
- `src/middleware/` — Auth, rate-limit, upload validation
- `src/utils/` — Shared helpers (JWT, email, cloudinary)

## Conventions
- Zod for all request body/query validation at the route level
- Never build MongoDB queries with string interpolation — use Mongoose methods
- Always set correct HTTP status codes: 201 Created, 204 No Content, 400, 401, 403, 404
- Never expose stack traces or DB internals in API error responses
- `express-rate-limit` and Helmet must remain configured on all routes
- Auth: email + password (bcrypt); JWT access tokens (15m) + refresh tokens (7d)
- Firebase Admin used for FCM push notifications only
- File uploads: validate MIME type AND file extension before processing with Cloudinary

## Security
- Never commit `.env` — use `.env.example` as template
- `express-mongo-sanitize` is configured — do not bypass it
- No `console.log` in committed code

## Testing
- Framework: Jest + Supertest
- Run: `npm test` from this directory
- Mock at the model/service boundary, not the DB driver
- Test files: `src/__tests__/` or co-located as `*.test.ts`
- Always test: success case, validation failure (400), auth failure (401)

## Custom Skills
Use the skills in `.claude/skills/` when adding routes or writing tests:
- `add-api-route` — scaffold a new Express route end-to-end
- `write-backend-test` — write a Jest + Supertest route test
