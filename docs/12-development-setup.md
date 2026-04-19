# 12 — Development Setup

Get a working local Vocescribe development environment from zero.

---

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | 20.x LTS | `node --version` |
| pnpm | 9.x | `npm install -g pnpm` |
| ffmpeg | Any recent | `brew install ffmpeg` / `apt install ffmpeg` |
| Git | Any | — |

External accounts needed:
- [Neon](https://neon.tech) — create a project, copy the connection string for the dev branch
- [Clerk](https://clerk.com) — create an application (dev mode), get publishable + secret keys
- [Cloudflare R2](https://dash.cloudflare.com) — create a bucket `vocescribe-dev`, get account ID + API token
- [Inngest](https://inngest.com) — create an account (free), get event key + signing key
- [OpenAI](https://platform.openai.com) — API key with GPT-4o and TTS access

---

## Setup Steps

### 1. Clone and install

```bash
git clone <repo-url> vocescribe
cd vocescribe
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

```bash
NEON_DB_URL=postgresql://user:pass@host/dbname?sslmode=require

OPENAI_API_KEY=sk-...

CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...

R2_ACCOUNT_ID=abc123
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=vocescribe-dev

INNGEST_EVENT_KEY=...
INNGEST_SIGNING_KEY=...
```

### 3. Run database migrations

```bash
pnpm db:migrate
```

Applies the schema from `src/lib/db/schema.ts` to your Neon dev branch. Run once on first setup, then after any `pnpm db:generate` that produces new migration files.

### 4. Start the dev server

```bash
pnpm dev
```

Next.js starts at `http://localhost:3000`.

### 5. Start the Inngest dev server (separate terminal)

```bash
npx inngest-cli@latest dev -u http://localhost:3000/api/inngest
```

Inngest UI available at `http://localhost:8288`. This is required to run and debug audio generation jobs locally.

---

## Common Development Tasks

### Run all tests
```bash
pnpm test
```

### Run a single test file in watch mode
```bash
pnpm test:unit -- --watch src/lib/tts/chunker.test.ts
```

### Generate a new DB migration after schema changes
```bash
# 1. Edit src/lib/db/schema.ts
# 2. Generate migration SQL
pnpm db:generate
# 3. Review the generated file in drizzle/
# 4. Apply
pnpm db:migrate
```

### Inspect the database
```bash
# Using drizzle-kit studio (browser UI)
npx drizzle-kit studio
```

### Trigger a generation job manually (for debugging)
```bash
# Send an event directly to the local Inngest dev server
curl -X POST http://localhost:8288/e/your-event-key \
  -H "Content-Type: application/json" \
  -d '{"name":"audio/chapter.generate","data":{"chapterId":"...","audioJobId":"...","userId":"...","voice":"alloy"}}'
```

### Check R2 bucket contents
```bash
# List objects under a user prefix
aws s3 ls s3://vocescribe-dev/user_abc123/ \
  --endpoint-url https://<account-id>.r2.cloudflarestorage.com \
  --recursive
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `NEON_DB_URL: connection refused` | Check your Neon project is active (free tier auto-suspends) |
| Inngest functions not running | Ensure `pnpm dev` and `inngest-cli dev` are both running |
| `ffmpeg not found` | Install ffmpeg and ensure it's on `$PATH` |
| Clerk sign-in loop | Check `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` matches your dev app |
| R2 upload fails | Verify bucket name and that your API token has object write permissions |
| `epub2` parse error | The EPUB may be DRM-protected — try a DRM-free sample EPUB |

---

## Project Structure Reference

```
vocescribe/
├── src/
│   ├── app/
│   │   ├── (auth)/sign-in/     # Clerk sign-in page
│   │   ├── (auth)/sign-up/     # Clerk sign-up page
│   │   ├── (dashboard)/        # Protected pages
│   │   │   ├── layout.tsx      # Sidebar + auth guard
│   │   │   ├── library/        # Book grid
│   │   │   ├── books/[id]/     # Book detail + generation trigger
│   │   │   └── player/[bookId]/[chapterNumber]/
│   │   ├── api/v1/             # REST API route handlers
│   │   ├── api/inngest/        # Inngest serve handler
│   │   └── api/webhooks/clerk/ # Clerk webhook
│   ├── lib/
│   │   ├── db/
│   │   │   ├── schema.ts       # Drizzle table definitions
│   │   │   └── client.ts       # Neon connection + Drizzle instance
│   │   ├── storage/r2.ts       # R2 helpers
│   │   ├── openai/client.ts    # OpenAI SDK wrapper
│   │   ├── epub/parser.ts      # EPUB parsing
│   │   ├── tts/
│   │   │   ├── pipeline.ts     # Orchestrator
│   │   │   ├── chunker.ts      # Sentence chunking
│   │   │   └── alignment.ts    # Timestamp mapping
│   │   └── inngest/
│   │       ├── client.ts       # Inngest client
│   │       └── functions.ts    # Job definitions
│   └── hooks/
│       └── use-lyric-sync.ts   # Player sync hook
├── drizzle/                    # Generated migration files
├── scripts/eval_alignment.py   # TTS eval script
├── .env.example                # Required env var checklist
├── drizzle.config.ts           # Drizzle ORM config
├── CLAUDE.md                   # AI assistant guidance
└── docs/                       # This documentation
```

---

*Back to [Documentation Hub](index.md)*
