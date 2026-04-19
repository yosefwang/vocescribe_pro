# 01 — Architecture

System-level design of Vocescribe: how components are organized, why each was chosen, and how they interact.

---

## C4 Level 1 — System Context

```
┌───────────────────────────────────────────────────────────────┐
│                         USER                                  │
│  (reader, author, language learner, accessibility user)       │
└───────────────────────────────┬───────────────────────────────┘
                                │  Browser / future iOS client
                                ▼
                    ┌───────────────────────┐
                    │      VOCESCRIBE        │
                    │  Web application       │
                    └──────────┬────────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                 ▼
       ┌─────────────┐  ┌───────────┐   ┌───────────────┐
       │  Clerk      │  │  OpenAI   │   │ Cloudflare R2 │
       │  (Auth SaaS)│  │  GPT-4o   │   │ (Object store)│
       └─────────────┘  │  TTS API  │   └───────────────┘
                        └───────────┘
```

**External systems:**
- **Clerk** — authentication and session management (OAuth, magic link, webhooks)
- **OpenAI** — GPT-4o for text cleanup; `gpt-4o-mini-tts` / `tts-1-hd` for speech synthesis
- **Cloudflare R2** — S3-compatible object storage for EPUB files, cover images, MP3s, alignment JSON

---

## C4 Level 2 — Containers

```
┌────────────────────────────────────────────────────────────┐
│                   VOCESCRIBE SYSTEM                         │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │   Next.js App  (Vercel)                              │  │
│  │                                                      │  │
│  │  ┌────────────────┐    ┌─────────────────────────┐  │  │
│  │  │  React Frontend│    │  Route Handlers /api/v1  │  │  │
│  │  │  App Router    │◄──►│  (REST API, TypeScript)  │  │  │
│  │  │  Tailwind/shadcn│   │  Zod validation          │  │  │
│  │  └────────────────┘    └──────────┬──────────────┘  │  │
│  └─────────────────────────────────  │  ──────────────┘  │
│                                      │                    │
│  ┌──────────────┐    ┌───────────────┼──────────────┐    │
│  │  Inngest     │◄───┤               │               │    │
│  │  (bg jobs)   │    │  ┌────────────▼──────────┐   │    │
│  └──────┬───────┘    │  │ Neon Postgres (Drizzle)│   │    │
│         │            │  └───────────────────────┘   │    │
│         ▼            └──────────────────────────────┘    │
│  generate-chapter-audio                                    │
│  (parse → clean → TTS → align → upload)                   │
└────────────────────────────────────────────────────────────┘
```

| Container | Technology | Deployed on |
|---|---|---|
| Web frontend + API | Next.js 14 (App Router) | Vercel |
| Background job runner | Inngest | Inngest cloud + Vercel |
| Relational database | Neon Serverless Postgres | Neon |
| Object storage | Cloudflare R2 | Cloudflare |

---

## Key Design Decisions

### 1. Next.js as both frontend and API

**Decision:** Use Next.js Route Handlers for the REST API instead of a separate backend service.

**Rationale:** Monorepo simplicity; zero cold-start latency for API calls from the same Vercel deployment; shared TypeScript types between frontend and backend; Clerk middleware integrates natively.

**Trade-off:** API and frontend scale together — cannot independently scale the API tier. Acceptable at the current traffic level.

---

### 2. Inngest for background jobs instead of serverless functions with timeouts

**Decision:** Use Inngest for the audio generation pipeline.

**Rationale:** Processing a chapter (GPT-4o + TTS per chunk + ffmpeg) can take 30–90 seconds. Vercel serverless functions time out at 10s (Hobby) / 60s (Pro). Inngest provides durable execution, retries, step-level progress, and per-user concurrency limits without managing a job queue manually.

**Trade-off:** Additional external dependency. Inngest free tier is sufficient for development; paid plan needed at scale.

---

### 3. Chapter-level parallelism

**Decision:** Audio generation is parallelized at the chapter level (max 3 per user), not the sentence level.

**Rationale:** Chapter-level granularity allows independent retry of failed chapters. Users can start listening to early chapters while later ones are still processing. Each chapter is an atomic unit for billing and quality tracking.

---

### 4. Cloudflare R2 over S3

**Decision:** Store all binary files (EPUB, audio, JSON) on Cloudflare R2.

**Rationale:** No egress fees (unlike S3). S3-compatible API means `@aws-sdk/client-s3` works unchanged. Cost at scale is significantly lower for a media-heavy workload.

---

### 5. Neon Serverless Postgres

**Decision:** Neon over self-hosted Postgres or PlanetScale.

**Rationale:** Branch-per-environment feature allows ephemeral preview databases for each PR. Auto-suspend saves cost during development. Serverless connection pooling avoids the N+1 connection problem common in Next.js serverless deployments.

---

## Data Flow Summary

```
[User] → upload EPUB
  → API validates + stores on R2
  → epub2 parses metadata + chapters
  → DB: books + chapters rows created
  → [User] triggers generation
  → Inngest enqueued per chapter
    → GPT-4o cleans text + splits sentences
    → chunks ≤4000 chars
    → TTS per chunk → MP3 + word timestamps
    → timestamps mapped to sentence boundaries
    → ffmpeg concat (multi-chunk)
    → MP3 + alignment JSON uploaded to R2
    → DB updated (status, duration, keys)
  → [User] opens player
    → alignment JSON fetched from API
    → audio streamed via signed R2 URL
    → timeupdate → binary search → highlight sentence
```

---

## Technology Choices at a Glance

| Concern | Choice | Key Reason |
|---|---|---|
| Language | TypeScript | End-to-end type safety |
| Frontend | React 18 + Tailwind + shadcn/ui | Composable UI, zero CSS maintenance |
| Auth | Clerk | Drop-in OAuth, session webhooks |
| DB ORM | Drizzle | Type-safe, lightweight, SQL-first |
| Validation | Zod | Schema = runtime validator + TypeScript type |
| EPUB parsing | epub2 | Handles OPS spine, TOC, cover extraction |
| TTS | OpenAI gpt-4o-mini-tts / tts-1-hd | Word-level timestamps; natural voices |
| Text cleanup | OpenAI GPT-4o | Reliable sentence splitting + OCR correction |
| Audio concat | ffmpeg | Industry-standard; lossless MP3 stream copy |
| Package manager | pnpm | Fast, disk-efficient, strict hoisting |

---

*Next: [02 — Data Model](02-data-model.md)*
