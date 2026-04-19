# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Vocescribe** — AI-powered audiobook generator that transforms EPUB ebooks into narrated audio with per-sentence timestamp sync (karaoke-style highlighting). Web-first; API designed mobile-ready for future iOS client.

The full product specification lives in [Vocescribe_PRD.md](Vocescribe_PRD.md). Consult it for API endpoint details, database schema DDL, GPT-4o system prompts, alignment data format, and acceptance criteria.

## Tech Stack

- **Framework:** Next.js 14 (App Router) — frontend + API route handlers in one app
- **Language:** TypeScript end-to-end
- **Auth:** Clerk (OAuth + magic link, middleware on dashboard routes, webhook syncs to users table)
- **Database:** Neon (serverless Postgres) via Drizzle ORM
- **Object storage:** Cloudflare R2 (S3-compatible) — EPUBs, covers, MP3s, alignment JSON
- **AI:** OpenAI GPT-4o (text cleanup/sentence splitting) + gpt-4o-mini-tts / tts-1-hd (speech synthesis with word timestamps)
- **Background jobs:** Inngest (durable task queue, max 3 concurrent chapters per generation)
- **UI:** React 18, Tailwind CSS, shadcn/ui
- **Validation:** Zod
- **Package manager:** pnpm
- **Testing:** Vitest (unit + integration), Playwright (E2E)

## Development Commands

```bash
pnpm dev                # Start dev server
pnpm build              # Production build
pnpm lint               # Lint
pnpm typecheck          # TypeScript type checking
pnpm test               # Run all tests
pnpm test:unit          # Unit tests only
pnpm test:integration   # Integration tests only
pnpm test:unit -- --run src/lib/tts/chunker.test.ts  # Single test file
pnpm db:generate        # Generate Drizzle migration
pnpm db:migrate         # Run migration
pnpm eval:run           # Run TTS quality eval suite
pnpm eval:check         # Check eval against thresholds
```

## Architecture

```
Client (Next.js SPA)
  ├── Upload, Library, Player, Settings
  └── Clerk auth
        │ HTTPS + Bearer token
        ▼
API Layer (Route Handlers under /api/v1)
  ├── /books — CRUD + upload
  ├── /books/{id}/chapters — chapter list + detail
  ├── /books/{id}/generate — trigger + status polling
  ├── /chapters/{id}/generate — single chapter
  ├── /audio/{id} — stream (302 to R2 signed URL), download, alignment
  ├── /books/{id}/playback — GET/PUT position + speed
  └── /webhooks/clerk — user sync
        │
        ▼
Neon DB (users, books, chapters, audio_jobs, playback_states)
Cloudflare R2 (binary storage, paths: {user_id}/{book_id}/...)
Inngest (background jobs)
OpenAI API (GPT-4o + TTS)
```

### Key Technical Flows

- **EPUB upload:** validate → SHA-256 dedup → parse with epub2 (metadata, cover, spine/TOC) → store on R2 → create DB rows
- **Audio generation (per chapter, parallelized):** GPT-4o text cleanup → chunk to ≤4000 chars → TTS per chunk with word timestamps → map word timestamps to sentence boundaries → ffmpeg concat multi-chunk MP3s → upload ch{N}.mp3 + ch{N}_align.json to R2
- **Lyric sync playback:** audio.timeupdate → binary search alignment JSON → highlight current sentence → auto-scroll. Click sentence → seek to start_time.

### Source Layout

```
src/
  app/                    # Next.js App Router pages and API routes
    (auth)/               # Clerk sign-in/sign-up pages
    (dashboard)/          # Protected pages (library, book detail, player)
    api/v1/               # REST API endpoints
    api/webhooks/clerk/   # Clerk webhook handler
  lib/
    db/schema.ts          # Drizzle schema (5 tables: users, books, chapters, audio_jobs, playback_states)
    db/client.ts          # Neon/Drizzle client
    storage/r2.ts         # R2 upload/download/delete
    openai/client.ts      # OpenAI SDK wrapper
    epub/parser.ts        # EPUB parsing (epub2)
    tts/pipeline.ts       # Orchestrates cleanup → chunk → TTS → concat → upload
    tts/alignment.ts      # Word→sentence timestamp mapping + cumulative offsets
    tts/chunker.ts        # Splits sentences into ≤4000 char groups
    inngest/client.ts     # Inngest client config
    inngest/functions.ts  # Background job definitions
  hooks/use-lyric-sync.ts # Frontend: timeupdate → binary search → highlight
```

## Environment Variables

See `.env.example` — all secrets via Vercel env vars (runtime) and GitHub Actions (CI). Never commit secrets. Required: `NEON_DB_URL`, `OPENAI_API_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`.

## Frontend Design

UI design mockups live in `ui/`. **Frontend implementation must match the design files pixel-perfectly** — no approximations.

| File | Purpose |
|---|---|
| `ui/Vocescribe.html` | Desktop interactive prototype (all screens) |
| `ui/Vocescribe Mobile.html` | Mobile screens showcase |
| `ui/mobile.jsx` | Mobile React component source |
| `ui/app.js` | Desktop JS/React prototype |
| `ui/frames/ios-frame.jsx` | iOS device frame + native components |

Open the HTML files in a browser before implementing any screen — they are the ground truth.

Design system documentation: [docs/13-design-system.md](docs/13-design-system.md) (tokens, typography, all components with exact CSS values)  
Screen implementation guide: [docs/14-ui-screens.md](docs/14-ui-screens.md) (screen-by-screen layout specs)

**Key design decisions:**
- Color palette: warm parchment (`#F5F0E6`) surfaces, near-black ink (`#1A1613`), gold accent (`#A8732F`/`#B8894A`)
- Fonts: Newsreader (serif, reading + headings) · Inter Tight (sans, UI chrome) · JetBrains Mono (metadata, mono everywhere)
- Dark mode: `html[data-theme="dark"]` on desktop, `.dark` class on mobile — CSS variables handle everything
- `border-radius: 2px` everywhere (not 4px, not rounded-full) — except mobile cards (4px) and floating mini player (8px)

## Development Phases

Development follows a 5-phase plan (Phases 0–4, ~28–41 hours total). Each phase builds on the previous and is independently testable. See PRD Section 10 for detailed per-phase instructions.

| Phase | Scope | Milestone |
|-------|-------|-----------|
| 0 | Scaffolding | Green CI, Clerk + DB + R2 connected |
| 1 | Auth + Upload + Library | Upload EPUB, browse library |
| 2 | Audio Generation Pipeline | Generate audio with alignment JSON |
| 3 | Player with Lyric Sync | Play with synced sentence highlighting |
| 4 | Eval + Polish + Prod | Eval suite passes, production deploy |

## Constraints

- Max EPUB size: 50 MB
- Max TTS chunk: ~4000 chars per OpenAI call
- Audio format: MP3
- User isolation: all data scoped by user_id (DB rows + R2 paths)
- Rate limits: 5 uploads/hr, 3 concurrent generations per user
