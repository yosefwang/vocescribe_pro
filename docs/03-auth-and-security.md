# 03 — Auth & Security

Authentication architecture, user isolation model, and security controls.

---

## Authentication Provider: Clerk

Clerk handles all identity concerns — OAuth providers, magic link email, session tokens, and JWKS rotation — so the application never touches passwords or raw credentials.

**Supported sign-in methods:**
- Google OAuth
- GitHub OAuth
- Email magic link

---

## Middleware

Next.js middleware (`src/middleware.ts`) intercepts every request before it reaches a route handler:

```
Request
  │
  ├── /api/webhooks/clerk  → Allow (webhook validates Svix signature internally)
  │
  ├── /api/v1/**           → Require valid Clerk session token
  │                          401 UNAUTHORIZED if missing or expired
  │
  ├── /(auth)/**           → Public (sign-in / sign-up pages)
  │
  └── /(dashboard)/**      → Require active session
                             Redirect to /sign-in if unauthenticated
```

Route handlers extract `userId` from the session:
```typescript
import { auth } from '@clerk/nextjs/server';

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 });
  // ...
}
```

`userId` is the Clerk user ID (e.g. `user_2abc...`) and is the foreign key used throughout the database. It is **never** passed in request bodies or query parameters — always resolved from the authenticated session.

---

## User Sync: Clerk Webhook

When a user creates an account or updates their profile, Clerk calls `POST /api/webhooks/clerk`. The handler verifies the request signature using the **Svix** library (Clerk's webhook verification partner), then upserts the `users` table:

```
Clerk → POST /api/webhooks/clerk
  → Verify Svix-Id, Svix-Timestamp, Svix-Signature headers
  → On user.created / user.updated: UPSERT users (id, email, name, avatar_url)
  → On user.deleted: CASCADE deletes propagate via DB foreign keys
```

No Clerk-internal state is cached or duplicated beyond what the `users` table contains. The DB `users` table is a satellite — it exists only to satisfy FK constraints and support analytics queries.

---

## User Isolation Model

Every piece of user data is isolated at two layers:

### 1. Database Layer

All queries include `user_id` in the WHERE clause, or traverse the ownership chain:

| Table | Isolation method |
|---|---|
| `books` | Direct: `WHERE user_id = $userId` |
| `chapters` | Via join: `books.user_id = $userId` |
| `audio_jobs` | Via join: `chapters → books.user_id = $userId` |
| `playback_states` | Direct: `WHERE user_id = $userId` |

A request for a resource that exists but belongs to another user returns `403 FORBIDDEN` (not `404`) to avoid leaking existence to authenticated users.

### 2. Storage Layer (R2)

R2 object keys are namespaced by `user_id`:

```
{userId}/{bookId}/original.epub
{userId}/{bookId}/cover.jpg
{userId}/{bookId}/ch1.mp3
{userId}/{bookId}/ch1_align.json
```

There is no public bucket policy. All reads go through signed URLs with a 1-hour expiry, generated server-side after ownership verification. Clients never receive permanent R2 URLs.

---

## Rate Limiting

Applied at the API layer (Phase 4):

| Operation | Limit |
|---|---|
| EPUB upload | 5 per user per hour |
| Concurrent audio generation | 3 chapters per user (enforced by Inngest) |
| Global concurrent generations | 10 chapters |

---

## Input Validation

All request bodies and URL parameters are validated with **Zod** schemas before processing. Invalid input returns `400` with a structured error body before any database or storage access occurs.

```typescript
const GenerateRequestSchema = z.object({
  voice: z.enum(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']),
  chapters: z.array(z.number().int().positive()).optional(),
  overwrite_existing: z.boolean().default(false),
});
```

---

## Secrets Management

All secrets are environment variables — never in source code or committed files.

| Secret | Where stored |
|---|---|
| `CLERK_SECRET_KEY` | Vercel env + GitHub Actions |
| `OPENAI_API_KEY` | Vercel env + GitHub Actions |
| `NEON_DB_URL` | Vercel env + GitHub Actions |
| `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | Vercel env + GitHub Actions |
| `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY` | Vercel env + GitHub Actions |

`.env.example` (committed) documents required variables with empty values. `.env.local` (gitignored) holds developer values.

---

## Error Codes Reference

| Code | HTTP | Cause |
|---|---|---|
| `UNAUTHORIZED` | 401 | Missing or expired Clerk session |
| `FORBIDDEN` | 403 | Resource belongs to another user |
| `BOOK_NOT_FOUND` | 404 | Book does not exist |
| `FILE_TOO_LARGE` | 413 | EPUB > 50 MB |
| `INVALID_FILE_TYPE` | 415 | Not a valid EPUB |
| `GENERATION_IN_PROGRESS` | 409 | Generation already running for this book |
| `TTS_RATE_LIMITED` | 429 | OpenAI rate limit (auto-retried by Inngest) |
| `TTS_API_ERROR` | 502 | OpenAI TTS returned an error |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

All errors follow the same envelope:
```json
{ "error": { "code": "BOOK_NOT_FOUND", "message": "Book does not exist or you don't have access." } }
```

---

*Next: [04 — API Reference](04-api-reference.md)*
