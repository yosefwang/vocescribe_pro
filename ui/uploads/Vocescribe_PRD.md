# Vocescribe — AI-Powered Audiobook Generator

**Product Description & Technical Specification**
Version 1.0 | April 18, 2026

---

## Table of Contents

1. Executive Summary
2. Problem Statement & Vision
3. Core User Stories
4. System Architecture
5. Data Model
6. API Design
7. Key Technical Flows
8. Eval & Testing Strategy
9. CI/CD & Deployment
10. Claude Code Phased Development Instructions
11. Risk Register & Mitigations
12. Timeline & Milestones

---

## 1. Executive Summary

### 1.1 Product Overview

**Vocescribe** is a web application that transforms EPUB ebooks into AI-narrated audiobooks. Users upload an EPUB, the system parses it by chapter, calls OpenAI TTS + GPT-4o to generate audio with per-sentence timestamp alignment, and presents a synchronized reading experience — text highlighted like lyrics alongside the narrated audio.

### 1.2 Key Differentiators

| Feature | Description |
|---------|-------------|
| Chapter-level processing | Each chapter processed independently — parallelizable, resumable, re-generatable |
| Lyric-style sync | Per-sentence timestamp alignment creates a karaoke-like reading experience |
| Server-side storage | EPUB and generated audio persist on Cloudflare R2; accessible from any device |
| User isolation via Clerk | Clerk handles OAuth/signup/login; all data scoped per user |
| Web-first, iOS later | Phase 1 is Web + API; iOS consumes same API in Phase 2 |

### 1.3 Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Frontend | Next.js 14 (App Router) | SSR, file upload, Clerk integration |
| Backend API | Next.js Route Handlers | Monorepo simplicity, edge-ready |
| Database | Neon (Serverless Postgres) | Branch-per-env, auto-scaling |
| Object Storage | Cloudflare R2 | S3-compatible, no egress fees |
| Auth | Clerk | Drop-in OAuth, session management, webhooks |
| AI - Text | OpenAI GPT-4o | Text cleanup, sentence splitting |
| AI - TTS | OpenAI gpt-4o-mini-tts / tts-1-hd | Natural voices, timestamp output |
| Task Queue | Inngest | Durable background jobs |
| Deployment | Vercel + Cloudflare Workers | Zero-config Next.js deploy |

### 1.4 Constraints

- **Phase 1**: Web only. No iOS. API designed mobile-ready from day one.
- **Language**: TypeScript end-to-end.
- **Max EPUB size**: 50 MB.
- **Max TTS chunk**: ~4,000 chars per API call (OpenAI limit), split automatically.
- **Audio format**: MP3, stored as-is on R2.

---

## 2. Problem Statement & Vision

### 2.1 The Problem

| Pain Point | Detail |
|------------|--------|
| No affordable audiobook pipeline | Professional narration costs $100–$500+ per finished hour |
| Existing TTS tools are shallow | Browser extensions just "read aloud" with no chapter awareness or persistence |
| No lyric-sync for books | Music has karaoke. Nobody does per-sentence highlighting synced to audio for books |
| Data silos | Ebook in one app, audio in another. No unified library |

### 2.2 Vision

> Vocescribe makes every book hearable. Upload any EPUB → get back a fully narrated, chapter-by-chapter audiobook with synchronized text display.

### 2.3 Target Users

1. **Avid readers** — switch between reading and listening mid-book
2. **Self-published authors** — audio edition without $5K+ narration costs
3. **Language learners** — seeing + hearing simultaneously
4. **Accessibility users** — audiobook versions of texts not available in audio

### 2.4 Success Metrics (3 months post-launch)

| Metric | Target |
|--------|--------|
| Books processed | 1,000+ |
| Avg processing time (full book) | < 15 min for 300 pages |
| Lyric-sync accuracy | ≥ 95% sentence boundary |
| User retention (7-day) | ≥ 30% |

---

## 3. Core User Stories

### 3.1 EPUB Upload & Library

> As a logged-in user, I want to upload an EPUB file so it appears in my personal library.

**Acceptance Criteria:**
- Accept `.epub` up to 50 MB, show progress bar
- After upload: parse and display title, author, cover, chapter list, word count, estimated processing time
- Duplicate detection by content hash — prompt if already exists
- Store on R2: `{user_id}/{book_id}/original.epub`

### 3.2 Audiobook Generation

> As a user with a book in my library, I want to click "Generate Audiobook" to get chapter-by-chapter audio with synced text.

**Acceptance Criteria:**
- One-click generation; show per-chapter progress: Queued → Processing → Done / Failed
- Failed chapters retryable individually
- Background jobs — user can navigate away
- Voice selection (alloy, echo, fable, onyx, nova, shimmer)
- In-app notification when complete

### 3.3 Listening with Lyric Sync

> As a user, I want to play the audiobook and see text highlighted sentence-by-sentence like karaoke.

**Acceptance Criteria:**
- Sticky audio player with play/pause, skip ±15s, prev/next chapter, speed 0.75x–2x
- Current sentence highlighted, auto-scroll in view
- Click any sentence to jump audio to that position
- Resume where you left off across sessions

### 3.4 Library Management

- Grid/list view with cover thumbnails, status badges
- Delete book (removes EPUB + all audio from R2)
- Download individual chapter MP3 or full book as ZIP
- Sort by: title, date added, date generated, author

### 3.5 Authentication

- Clerk sign-in: Google, GitHub, email magic link
- All API endpoints require valid Clerk session
- R2 paths scoped by `user_id`; DB rows scoped by `user_id`
- Clerk webhook syncs user to `users` table

---

## 4. System Architecture

### 4.1 High-Level

```
┌──────────────────────────────────────────────────┐
│              CLIENT (Next.js SPA)                 │
│   Upload │ Library │ Player │ Settings            │
│   ──────────── Clerk Auth ────────────            │
└──────────────────────┬───────────────────────────┘
                       │ HTTPS + Bearer token
                       ▼
┌──────────────────────────────────────────────────┐
│         API LAYER (Next.js Route Handlers)        │
│   /books │ /chapters │ /audio │ /generate         │
│   ──────── Clerk Middleware ────────              │
└──────┬──────────┬──────────┬─────────────────────┘
       │          │          │
       ▼          ▼          ▼
  ┌─────────┐ ┌────────┐ ┌──────────────┐
  │ Neon DB │ │  R2    │ │  Inngest     │
  │ users   │ │ epub   │ │ (bg jobs)    │
  │ books   │ │ audio  │ │  parse EPUB  │
  │ chapters│ │ covers │ │  GPT-4o clean│
  │ jobs    │ │        │ │  TTS per ch  │
  │ playback│ │        │ │  upload R2   │
  └─────────┘ └────────┘ └──────┬───────┘
                             │
                             ▼
                      ┌─────────────┐
                      │ OpenAI API  │
                      │ GPT-4o      │
                      │ TTS HD      │
                      └─────────────┘
```

### 4.2 Component Responsibilities

| Component | Responsibility | Tech |
|-----------|---------------|------|
| Next.js Frontend | UI, upload, player, state | React 18, Tailwind, shadcn/ui |
| Next.js API Routes | REST endpoints, auth, validation | TypeScript, Zod |
| Clerk | Auth, sessions, user sync | Clerk SDK |
| Neon DB | Structured data | Serverless Postgres |
| Cloudflare R2 | Binary file storage | S3-compatible API |
| Inngest | Durable background jobs | Inngest SDK |
| OpenAI GPT-4o | Text cleanup, sentence splitting | Chat Completions |
| OpenAI TTS | Speech with timestamps | Audio API |

### 4.3 Audio Generation Flow

```
User clicks "Generate"
  → POST /api/generate { book_id, voice }
  → Validate ownership + no active generation
  → Create audio_jobs rows (one per chapter, status=queued)
  → Enqueue Inngest workflow

Per chapter (parallel, max 3):
  1. Load chapter text from DB
  2. GPT-4o cleanup: remove page numbers, fix OCR, split into sentences
  3. Chunk sentences into ≤4000 char groups (preserve sentence boundaries)
  4. TTS per chunk → collect MP3 + word timestamps
  5. Concatenate chunks (ffmpeg), offset timestamps
  6. Upload ch{N}.mp3 + ch{N}_align.json to R2
  7. Update DB: duration, R2 URL, status

All done → update book status to "ready"
```

### 4.4 Playback Flow

```
User opens player for chapter N
  → GET /chapters/{id}/alignment  (sentence timestamps)
  → GET /audio/{id}/stream        (R2 signed URL)
  → Frontend: audio.timeupdate → binary search alignment → highlight sentence
  → Click sentence → seek audio to sentence.start_time
```

---

## 5. Data Model

### 5.1 ER Diagram

```
users ──1:N── books ──1:N── chapters ──1:1── audio_jobs
users ──1:N── playback_states
```

### 5.2 SQL Schema

```sql
CREATE TABLE users (
    id            TEXT PRIMARY KEY,          -- Clerk user ID
    email         TEXT NOT NULL,
    name          TEXT,
    avatar_url    TEXT,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE books (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title         TEXT NOT NULL,
    author        TEXT,
    description   TEXT,
    cover_r2_key  TEXT,
    epub_r2_key   TEXT NOT NULL,
    language      TEXT DEFAULT 'en',
    status        TEXT NOT NULL DEFAULT 'uploaded'
                  CHECK (status IN ('uploaded','processing','ready','failed')),
    content_hash  TEXT,
    total_chapters INTEGER,
    total_word_count INTEGER,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_books_user_id ON books(user_id);

CREATE TABLE chapters (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id         UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    chapter_number  INTEGER NOT NULL,
    title           TEXT,
    raw_text        TEXT NOT NULL,
    cleaned_text    TEXT,
    sentences       JSONB,
    word_count      INTEGER,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(book_id, chapter_number)
);

CREATE TABLE audio_jobs (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_id        UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    voice             TEXT NOT NULL DEFAULT 'alloy'
                      CHECK (voice IN ('alloy','echo','fable','onyx','nova','shimmer')),
    status            TEXT NOT NULL DEFAULT 'queued'
                      CHECK (status IN ('queued','running','done','failed')),
    audio_r2_key      TEXT,
    alignment_r2_key  TEXT,
    duration_sec      FLOAT,
    file_size_bytes   BIGINT,
    error_message     TEXT,
    attempts          INTEGER DEFAULT 0,
    started_at        TIMESTAMPTZ,
    completed_at      TIMESTAMPTZ,
    created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_audio_jobs_chapter ON audio_jobs(chapter_id);

CREATE TABLE playback_states (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id         UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    chapter_id      UUID REFERENCES chapters(id) ON DELETE SET NULL,
    position_sec    FLOAT DEFAULT 0,
    playback_speed  FLOAT DEFAULT 1.0,
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, book_id)
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_books_updated BEFORE UPDATE ON books FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_chapters_updated BEFORE UPDATE ON chapters FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 5.3 Alignment Data Format (`ch{N}_align.json`)

```json
{
  "chapter_id": "uuid",
  "voice": "alloy",
  "total_duration_sec": 342.5,
  "sentences": [
    {
      "index": 0,
      "text": "It was a bright cold day in April, and the clocks were striking thirteen.",
      "start_time": 0.0,
      "end_time": 4.82,
      "start_char": 0,
      "end_char": 72
    },
    {
      "index": 1,
      "text": "Winston Smith, his chin nuzzled into his breast...",
      "start_time": 5.10,
      "end_time": 13.45,
      "start_char": 73,
      "end_char": 221
    }
  ]
}
```

**How it's built:** GPT-4o splits text into sentences → TTS per chunk with word timestamps → map word timestamps to sentence boundaries via character offsets → multi-chunk chapters get cumulative time offsets → final JSON uploaded to R2.

---

## 6. API Design

All endpoints require Clerk Bearer token. Base: `/api/v1`

### 6.1 Books

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/books` | List user's books (paginated, sortable, filterable by status) |
| `POST` | `/books/upload` | Upload EPUB (multipart/form-data, max 50MB) |
| `GET` | `/books/{id}` | Book details + chapter list + audio status |
| `DELETE` | `/books/{id}` | Delete book + all data + R2 files |

**POST /books/upload response (201):**
```json
{
  "id": "uuid",
  "title": "1984",
  "author": "George Orwell",
  "cover_url": "https://r2.../cover.jpg",
  "total_chapters": 23,
  "total_word_count": 88926,
  "status": "uploaded",
  "chapters": [
    { "chapter_number": 1, "title": "Part One, Chapter 1", "word_count": 3842 }
  ]
}
```

### 6.2 Chapters

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/books/{bookId}/chapters` | List all chapters |
| `GET` | `/books/{bookId}/chapters/{n}` | Chapter text + audio status |

**GET /books/{bookId}/chapters/{n} response:**
```json
{
  "id": "uuid",
  "chapter_number": 1,
  "title": "Part One, Chapter 1",
  "word_count": 3842,
  "text_preview": "It was a bright cold day in April...",
  "audio": {
    "status": "done",
    "voice": "alloy",
    "duration_sec": 342.5,
    "stream_url": "/api/v1/audio/{id}/stream",
    "alignment_url": "/api/v1/audio/{id}/alignment"
  }
}
```

### 6.3 Audio Generation

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/books/{bookId}/generate` | Start generation (voice, chapters, overwrite options) |
| `POST` | `/chapters/{id}/generate` | Generate single chapter |
| `POST` | `/audio/{id}/retry` | Retry failed job |
| `GET` | `/books/{bookId}/generate/status` | Per-chapter progress polling |

**POST /books/{bookId}/generate request:**
```json
{
  "voice": "alloy",
  "chapters": [1, 2, 3],
  "overwrite_existing": false
}
```

**GET /books/{bookId}/generate/status response:**
```json
{
  "total_chapters": 23,
  "summary": { "queued": 2, "running": 3, "done": 15, "failed": 1, "not_started": 2 },
  "chapters": [
    { "chapter_number": 1, "title": "...", "status": "done", "progress_pct": 100 },
    { "chapter_number": 2, "title": "...", "status": "running", "progress_pct": 65 },
    { "chapter_number": 5, "title": "...", "status": "failed", "error": "TTS rate limit" }
  ]
}
```

### 6.4 Audio Playback

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/audio/{id}/stream` | 302 redirect to R2 signed URL |
| `GET` | `/audio/{id}/download` | Download MP3 file |
| `GET` | `/audio/{id}/alignment` | Sentence-level alignment JSON |

### 6.5 Playback State

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/books/{bookId}/playback` | Get saved position |
| `PUT` | `/books/{bookId}/playback` | Save position `{ chapter_id, position_sec, playback_speed }` |

### 6.6 Error Format

```json
{
  "error": {
    "code": "BOOK_NOT_FOUND",
    "message": "Book does not exist or you don't have access."
  }
}
```

| Code | Status | Description |
|------|--------|-------------|
| `UNAUTHORIZED` | 401 | Invalid Clerk session |
| `FORBIDDEN` | 403 | Resource belongs to another user |
| `BOOK_NOT_FOUND` | 404 | Book not found |
| `FILE_TOO_LARGE` | 413 | EPUB exceeds 50 MB |
| `INVALID_FILE_TYPE` | 415 | Not a valid EPUB |
| `GENERATION_IN_PROGRESS` | 409 | Generation already running |
| `TTS_RATE_LIMITED` | 429 | OpenAI rate limit (auto-retried) |
| `TTS_API_ERROR` | 502 | OpenAI TTS error |
| `INTERNAL_ERROR` | 500 | Unexpected error |

---

## 7. Key Technical Flows

### 7.1 EPUB Parsing Pipeline

```
Upload EPUB → validate type & size → SHA-256 hash (dedup check)
→ upload original.epub to R2: {user_id}/{book_id}/original.epub
→ parse with epub2:
    extract metadata (title, author, language)
    extract cover → R2: {user_id}/{book_id}/cover.jpg
    extract spine/TOC → map to chapters
    per chapter: extract HTML → strip tags → raw_text → word_count
→ create books + chapters rows in DB
→ return book object to client
```

### 7.2 GPT-4o Text Cleanup

System prompt for text processing:

```
You are a text preparation assistant for TTS.

Given raw chapter text from an EPUB:
1. Remove page numbers, headers, footers, footnote markers
2. Fix OCR artifacts (rn→m, ﬀ→ff)
3. Fix hyphenated line breaks (unfor-\ntunately → unfortunately)
4. Remove image captions / figure references
5. Normalize quotes and dashes for spoken language
6. Split into sentences

Return JSON:
{
  "cleaned_text": "full cleaned string",
  "sentences": [
    {"index": 0, "text": "...", "start_char": 0, "end_char": 72}
  ]
}

Rules: start_char/end_char map to cleaned_text positions. Do NOT alter meaning.
For chapters > 6000 chars: split into sub-chunks, process separately, merge sentence arrays.
```

### 7.3 TTS with Timestamps

```typescript
// Per chunk (≤4000 chars)
const response = await openai.audio.speech.create({
  model: 'gpt-4o-mini-tts',
  voice: 'alloy',
  input: chunkText,
  response_format: 'mp3',
});

// Word-level timestamps → map to sentence boundaries:
// sentence.start_time = first_word_in_range.start
// sentence.end_time = last_word_in_range.end

// Multi-chunk: add cumulative duration offset to all timestamps
let offset = 0;
for (const chunk of chunks) {
  chunk.sentences.forEach(s => { s.start_time += offset; s.end_time += offset; });
  offset += chunk.durationSec;
}
```

### 7.4 Audio Concatenation (Multi-chunk)

```bash
# ffmpeg concat for multi-chunk chapters
echo "file 'chunk_0.mp3'" > /tmp/filelist.txt
echo "file 'chunk_1.mp3'" >> /tmp/filelist.txt
ffmpeg -f concat -safe 0 -i /tmp/filelist.txt -c copy ch_final.mp3
```

### 7.5 Lyric-Sync Player (Frontend)

```
┌──────────────────────────────────────────────────┐
│  ◀◀  ▶  ▶▶   0:00 ━━━━●━━━━━ 3:42   1.0x  🔊  │  ← sticky player
├──────────────────────────────────────────────────┤
│                                                  │
│  It was a bright cold day in April, and the      │  ← faded
│  clocks were striking thirteen.                  │
│                                                  │
│  ████ Winston Smith, his chin nuzzled ████      │  ← HIGHLIGHTED
│  ████ into his breast in an effort to ████      │
│  ████ escape the vile wind, slipped ████        │
│                                                  │
│  Though not quickly enough to prevent            │  ← normal
│  a swirl of gritty dust from entering...         │
│                                                  │
│  ◀ Prev Chapter     ●●● 3 / 23      Next ▶      │
└──────────────────────────────────────────────────┘
```

```typescript
// Core sync logic
function useLyricSync(alignment, audioRef) {
  // On timeupdate: binary search sentences → highlight current
  // On sentence click: seek audio to sentence.start_time
  // Auto-scroll current sentence into view
}
```

---

## 8. Eval & Testing Strategy

### 8.1 Testing Pyramid

```
         ╱╲
        ╱  ╲        E2E (Playwright: full user flows)
       ╱────╲
      ╱ Integ ╲     API tests with mocked OpenAI
     ╱──────────╲
    ╱  Unit Tests ╲  Pure functions: chunker, alignment, parser
   ╱────────────────╲
```

### 8.2 Unit Tests

| Module | What to Test |
|--------|-------------|
| `chunker.ts` | Sentence boundary preservation, 4000 char limit |
| `alignment.ts` | Word→sentence timestamp mapping, cumulative offsets |
| `epubParser.ts` | Sample EPUB → chapters, metadata, cover |
| `r2Client.ts` | Upload/download/delete (mocked S3) |

### 8.3 Integration Tests

| Flow | Test |
|------|------|
| Upload | Real EPUB → DB records + R2 files + cover |
| Auth | Clerk token → returns user's books only |
| Generation | Mocked TTS → verify alignment JSON structure |
| Playback | Alignment + audio URL → streaming works |
| Errors | Invalid EPUB, oversized, concurrent generation |

### 8.4 TTS Quality Eval

**Automated Metrics:**

| Metric | How | Target |
|--------|-----|--------|
| Sentence boundary accuracy | GPT-4o splits vs. human ground truth (F1) | ≥ 0.92 |
| Timestamp drift | avg \|predicted - actual\| per sentence | ≤ 200ms |
| Audio continuity | Energy-based click/gap detection at chunk boundaries | 0 artifacts |
| Silence detection | Gaps > 3s (indicates TTS failure) | 0 occurrences |

**Human Evaluation (periodic):**

| Aspect | Scale | Method |
|--------|-------|--------|
| Naturalness | 1–5 MOS | 20 random chapters |
| Pronunciation | Pass/Fail | 50 hard words per voice |
| Alignment feel | 1–5 | Does highlighting feel in time? |

### 8.5 Alignment Precision Script

```python
def eval_alignment(predicted, ground_truth):
    errors_start = [abs(p['start_time'] - g['start_time'])
                    for p, g in zip(predicted, ground_truth)]
    errors_end   = [abs(p['end_time'] - g['end_time'])
                    for p, g in zip(predicted, ground_truth)]
    return {
        'mean_start_error_ms': mean(errors_start) * 1000,   # target: ≤ 300
        'mean_end_error_ms':   mean(errors_end) * 1000,     # target: ≤ 500
        'boundary_accuracy_pct': ...                         # target: ≥ 90%
    }
```

### 8.6 Eval Test Corpus

Prepare 10 EPUBs covering: classic novel, technical text, non-English, poetry, short (1 chapter), long (50+ chapters), heavy dialogue, academic, children's book, bad OCR.

---

## 9. CI/CD & Deployment

### 9.1 Infrastructure

```
GitHub main  → Vercel (Production)
GitHub dev   → Vercel (Preview)
GitHub PRs   → Vercel (per-PR preview)
GitHub Actions: lint + typecheck + test + DB migration + eval suite
```

### 9.2 CI Pipeline (`.github/workflows/ci.yml`)

```yaml
name: CI
on:
  push:
    branches: [main, dev]
  pull_request:
    branches: [main]

jobs:
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck

  unit-tests:
    needs: lint-and-typecheck
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm test:unit --coverage

  integration-tests:
    needs: unit-tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm test:integration
        env:
          NEON_DB_URL: ${{ secrets.NEON_TEST_DB_URL }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_TEST_KEY }}

  db-migration:
    needs: lint-and-typecheck
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - run: pnpm db:migrate
        env:
          NEON_DB_URL: ${{ secrets.NEON_DB_URL }}

  eval-suite:
    needs: integration-tests
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - run: pnpm eval:run && pnpm eval:check
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

### 9.3 Environment Strategy

| Env | Neon DB | R2 Bucket | Clerk |
|-----|---------|-----------|-------|
| Local | Neon dev branch | R2 dev bucket | Clerk dev |
| Preview | Neon preview branch (per PR) | R2 preview | Clerk staging |
| Production | Neon production | R2 production | Clerk production |

### 9.4 R2 Setup

```bash
wrangler r2 bucket create vocescribe-prod
wrangler r2 bucket create vocescribe-preview
# CORS: allow vocescribe.app + *.vercel.app, GET only
```

### 9.5 Secrets

All in GitHub Actions (CI) + Vercel env vars (runtime). Never in code.

```bash
# .env.example (committed)
NEON_DB_URL=
OPENAI_API_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=
```

### 9.6 Monitoring

| What | Tool | Alert |
|------|------|-------|
| Page perf / errors | Vercel Analytics | p95 > 3s |
| Job health | Inngest Dashboard | failure rate > 10% |
| DB perf | Neon Console | connection spikes |
| API costs | OpenAI Dashboard | daily > $50 |

---

## 10. Claude Code Phased Development Instructions

> Paste each phase into Claude Code as the development prompt. Each phase builds on the previous and is independently testable.

### Phase 0: Project Scaffolding (2-3h)

**Goal:** Empty Next.js app with Clerk + DB + R2 connections. Zero features.

Create a Next.js 14 App Router project called "vocescribe":

1. `pnpm create next-app` — TypeScript, Tailwind, App Router, src/
2. Install deps: @clerk/nextjs, drizzle-orm, drizzle-kit, @neondatabase/serverless, @aws-sdk/client-s3, inngest, zod, openai, epub2, sharp, vitest
3. Project structure (all stubs):

```
src/
  app/
    layout.tsx                    — ClerkProvider wrapper
    page.tsx                      — Landing
    (auth)/sign-in, sign-up       — Clerk auth pages
    (dashboard)/
      layout.tsx                  — Protected sidebar layout
      library/page.tsx
      books/[id]/page.tsx
      player/[bookId]/[chapterNumber]/page.tsx
    api/v1/
      books/                      — CRUD + upload
      books/[bookId]/chapters/    — chapter list + detail
      books/[bookId]/generate/    — trigger + status
      chapters/[id]/generate/     — single chapter
      audio/[id]/                 — stream, download, alignment
      books/[bookId]/playback/    — GET + PUT
    api/webhooks/clerk/           — user sync
  lib/
    db/schema.ts, client.ts       — Drizzle schema (match Section 5.2)
    storage/r2.ts                 — R2 client
    openai/client.ts              — OpenAI client
    epub/parser.ts                — EPUB parser
    tts/pipeline.ts, alignment.ts, chunker.ts
    inngest/client.ts, functions.ts
  hooks/use-lyric-sync.ts
```

4. Config: ClerkProvider, Drizzle schema, R2 client, .env.example
5. Scripts: dev, build, lint, typecheck, test, test:unit, test:integration, db:generate, db:migrate
6. drizzle.config.ts → NEON_DB_URL
7. .github/workflows/ci.yml (match Section 9.2)

**Verify:** pnpm dev starts, Clerk renders, DB + R2 connect, tests pass.

---

### Phase 1: Auth + Upload + Library (4-6h)

**Goal:** Sign in, upload EPUB, browse library.

1. **Clerk Auth:** middleware on /(dashboard)/*, webhook upserts users table, sign-in (Google + GitHub + email), user menu in sidebar
2. **EPUB Upload** (POST /api/v1/books/upload): validate type+size, SHA-256 dedup, parse with epub2 (metadata, cover, chapters), upload to R2, create DB rows
3. **Library Page:** GET /books with pagination, grid of book cards (cover, title, status badge), empty state CTA
4. **Book Detail:** GET /books/{id}, show metadata + chapter list, "Generate Audiobook" button, voice selector, delete button

**Verify:** sign in → upload → see in library → view details. Cross-user isolation enforced.

---

### Phase 2: Audio Generation Pipeline (8-12h)

**Goal:** Background jobs generate audio with alignment data.

1. **Inngest setup:** configure client + dev server, create `generate-chapter-audio` function (max 3 concurrent)
2. **Per-chapter pipeline:**
   - GPT-4o text cleanup (prompt from Section 7.2)
   - Chunk sentences ≤4000 chars
   - TTS per chunk with word timestamps
   - Map word→sentence alignment with offsets
   - ffmpeg concat for multi-chunk chapters
   - Upload ch{N}.mp3 + ch{N}_align.json to R2
   - Update DB status
3. **API:** POST generate, GET status, POST retry
4. **Frontend:** poll status every 3s, per-chapter progress, toast on complete
5. **Tests:** chunker, alignment mapper, pipeline integration (mocked OpenAI)

**Verify:** Upload → Generate → watch progress → check R2 for MP3 + alignment JSON.

---

### Phase 3: Player with Lyric Sync (6-8h)

**Goal:** Play audiobooks with per-sentence highlighting.

1. **Player Page:** load chapter text + alignment + stream URL
2. **Audio Player:** sticky bottom bar, play/pause, skip ±15s, prev/next chapter, speed 0.75x–2x, progress bar
3. **Lyric Sync:** timeupdate → binary search alignment → highlight sentence → auto-scroll. Click sentence → seek.
4. **Chapter Nav:** prev/next buttons, dropdown selector, auto-advance on chapter end
5. **Persistence:** save position every 5s, resume on reopen
6. **Mobile responsive:** full-width text, touch-friendly controls

**Verify:** Play → watch highlighting → click to jump → switch chapters → refresh → resumes.

---

### Phase 4: Eval + Polish + Prod (8-12h)

**Goal:** Eval suite passes, UX polished, production ready.

1. **Eval suite:** 10-book test corpus, alignment precision script, threshold enforcement in CI
2. **UX:** loading skeletons, error boundaries, empty states, keyboard shortcuts (Space, arrows), dark mode
3. **Download:** single chapter MP3, full book ZIP
4. **Performance:** streaming R2 responses, lazy chapter text, prefetch next chapter
5. **Security:** rate limiting (5 uploads/hr, 3 concurrent generations), R2 signed URL expiry 1hr, Zod validation
6. **E2E:** Playwright — sign in → upload → generate → play with sync

**Verify:** Eval passes thresholds. E2E green. Lighthouse > 90. Zero console errors.

---

## 11. Risk Register & Mitigations

| # | Risk | Impact | Likelihood | Mitigation |
|---|------|--------|------------|------------|
| 1 | OpenAI TTS rate limits / outages | High | Medium | Exponential backoff + retry queue. Cache partials. Friendly retry UI. |
| 2 | TTS pricing changes | Medium | Low | Abstract TTS provider. Prepare ElevenLabs fallback. Track per-book cost. |
| 3 | EPUB parsing failures (weird formats, DRM) | Medium | Medium | 2+ parser fallbacks. Reject DRM early with clear message. |
| 4 | Alignment timestamp drift | Medium | Medium | Multi-chunk offset calibration. Eval suite catches regressions. |
| 5 | R2 storage costs scale | Low | Low | Per-user quotas. Orphan cleanup. Spend alerts. |
| 6 | Clerk outage | High | Very Low | 99.99% SLA. Cache sessions. Graceful offline mode. |
| 7 | Large books slow to process | Medium | Medium | Accurate ETA. Partial generation (listen to early chapters while later ones process). |
| 8 | GPT-4o cleanup alters meaning | Medium | Low | Diff review tool. Allow user to edit cleaned text before generation. |
| 9 | Concurrent generation overwhelms server | High | Low | Inngest concurrency: 3/user, 10 global. Queue excess. |
| 10 | MP3 concatenation artifacts | Medium | Low | ffmpeg crossfade. Eval detects artifacts. |

---

## 12. Timeline & Milestones

### 12.1 Phase Timeline

| Phase | Description | Est. Hours | Milestone |
|-------|-------------|-----------|-----------|
| 0 | Scaffolding | 2-3h | Green CI |
| 1 | Auth + Upload + Library | 4-6h | Upload EPUB, see in library |
| 2 | Audio Generation Pipeline | 8-12h | Generate audio with alignment |
| 3 | Player with Lyric Sync | 6-8h | Play with synced text |
| 4 | Eval + Polish + Prod | 8-12h | Eval passes, production deploy |
| | **Total** | **28-41h** | |

### 12.2 Recommended Schedule

- **Week 1:** Phase 0 + Phase 1 (scaffolding through working upload)
- **Week 2:** Phase 2 (TTS pipeline — the hardest part)
- **Week 3:** Phase 3 (player + lyric sync)
- **Week 4:** Phase 4 (eval, polish, production)

### 12.3 Cost Estimation (1000 users, 1000 books/month)

| Service | Cost |
|---------|------|
| Neon DB (Launch) | ~$19/mo |
| Cloudflare R2 (1TB storage) | ~$15/mo |
| Vercel Pro | ~$20/mo |
| Clerk Pro (10k MAU) | ~$25/mo |
| Inngest | $0–30/mo |
| OpenAI GPT-4o (text cleanup) | ~$50/mo |
| OpenAI TTS (~500 hours, tts-1-hd @ $30/1M chars) | ~$750/mo |
| **Total** | **~$880/mo** |

> Average book ~90K chars = ~$2.70/book for TTS.

### 12.4 Future (iOS + Beyond)

- iOS app via Expo (same API)
- Offline playback
- Multiple voices per book
- Social sharing of audiobook snippets
- Library import from Kindle / Apple Books
- Multi-language TTS
- Collaborative listening

---

*End of Vocescribe Product Description v1.0*
