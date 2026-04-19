# 11 — Deployment

CI/CD pipeline, environment strategy, secrets, and production monitoring.

---

## Infrastructure Overview

```
GitHub
  ├── main branch  → Vercel Production deploy
  ├── dev branch   → Vercel Preview deploy
  └── pull requests → Vercel per-PR preview + CI checks

GitHub Actions
  └── CI pipeline: lint → typecheck → unit tests → integration tests → DB migration → eval suite
```

---

## Vercel Configuration

Next.js deploys to Vercel with zero configuration. The `inngest/route.ts` handler is a standard serverless function; Inngest handles the execution outside Vercel's timeout limits.

**`vercel.json`** (if needed for custom headers/rewrites):
```json
{
  "headers": [
    {
      "source": "/api/v1/audio/:path*/stream",
      "headers": [{ "key": "Cache-Control", "value": "no-store" }]
    }
  ]
}
```

---

## CI Pipeline

Full pipeline defined in `.github/workflows/ci.yml`:

```
push to main / dev  OR  PR to main
  │
  ├── lint-and-typecheck (parallel)
  │     pnpm lint
  │     pnpm typecheck
  │
  ├── unit-tests (needs: lint-and-typecheck)
  │     pnpm test:unit --coverage
  │
  ├── integration-tests (needs: unit-tests)
  │     pnpm test:integration
  │     env: NEON_TEST_DB_URL, OPENAI_TEST_KEY
  │
  ├── db-migration (needs: lint-and-typecheck, only on main)
  │     pnpm db:migrate
  │     env: NEON_DB_URL (production)
  │
  └── eval-suite (needs: integration-tests, only on main)
        pnpm eval:run && pnpm eval:check
        env: OPENAI_API_KEY
```

---

## Environment Strategy

| Env | Neon DB | R2 Bucket | Clerk App | Inngest |
|---|---|---|---|---|
| **Local dev** | Neon dev branch | `vocescribe-dev` (or MinIO) | Clerk development | Inngest dev (local) |
| **PR Preview** | Neon preview branch (per PR) | `vocescribe-preview` | Clerk staging | Inngest staging |
| **Production** | Neon production branch | `vocescribe-prod` | Clerk production | Inngest production |

Neon's branch-per-environment feature means each PR preview gets a copy of the production schema, allowing integration tests against real data structures without touching production.

---

## Secrets

All secrets are stored in **GitHub Actions** (for CI) and **Vercel Environment Variables** (for runtime). They are never in source code or `.env` files committed to the repository.

| Variable | Used by |
|---|---|
| `NEON_DB_URL` | App server, DB migration |
| `NEON_TEST_DB_URL` | Integration tests only |
| `OPENAI_API_KEY` | App server, eval suite |
| `CLERK_SECRET_KEY` | App server, webhook verification |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Frontend (public) |
| `R2_ACCOUNT_ID` | App server |
| `R2_ACCESS_KEY_ID` | App server |
| `R2_SECRET_ACCESS_KEY` | App server |
| `R2_BUCKET_NAME` | App server |
| `INNGEST_EVENT_KEY` | App server (send events) |
| `INNGEST_SIGNING_KEY` | App server (verify Inngest calls) |

The committed `.env.example` documents all variables with empty values as a checklist for new environments.

---

## Cloudflare R2 Setup

```bash
# Create buckets
wrangler r2 bucket create vocescribe-prod
wrangler r2 bucket create vocescribe-preview
wrangler r2 bucket create vocescribe-dev

# Apply CORS (allow browser audio streaming from Vercel domains)
wrangler r2 bucket cors put vocescribe-prod --file cors.json
wrangler r2 bucket cors put vocescribe-preview --file cors.json
```

`cors.json`:
```json
[{
  "AllowedOrigins": ["https://vocescribe.app", "https://*.vercel.app", "http://localhost:3000"],
  "AllowedMethods": ["GET"],
  "AllowedHeaders": ["*"],
  "MaxAgeSeconds": 3600
}]
```

---

## Database Migration

Drizzle manages schema migrations:

```bash
pnpm db:generate   # generates SQL migration file from schema.ts changes
pnpm db:migrate    # applies pending migrations to NEON_DB_URL
```

In CI, `db-migration` runs on `main` only, after all tests pass. Migrations are applied to production automatically on merge to main — no manual step required.

---

## Monitoring

| What | Tool | Alert Condition |
|---|---|---|
| Page performance + JS errors | Vercel Analytics | p95 response time > 3s |
| Background job health | Inngest Dashboard | Failure rate > 10% over 15 min |
| Database performance | Neon Console | Connection count spike, slow query count |
| OpenAI API cost | OpenAI Dashboard | Daily spend > $50 |
| Uptime | Vercel (built-in) | Availability < 99.9% |

---

## Rollback

Vercel keeps the previous deployment active until the new one is fully promoted. Rollback is a one-click operation in the Vercel dashboard.

For database rollbacks: Drizzle does not auto-generate down migrations. A new forward migration must be written to undo changes. Critical migrations should be designed to be backwards-compatible (add columns before removing old ones).

---

*Next: [12 — Development Setup](12-development-setup.md)*
