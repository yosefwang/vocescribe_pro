# 02 — Data Model

Schema design, entity relationships, and access patterns for Vocescribe's Neon Postgres database (managed via Drizzle ORM).

---

## Entity Relationship Diagram

```
users
  │
  ├─1:N─► books ──1:N──► chapters ──1:1──► audio_jobs
  │                                         (voice, status, R2 keys)
  │
  └─1:N─► playback_states
              (per user+book: position, speed)
```

---

## Tables

### `users`

Synced from Clerk via webhook on `user.created` and `user.updated`. The primary key is the Clerk user ID (e.g. `user_2abc...`), not an auto-increment integer — this avoids any join between the auth system and the database.

```sql
CREATE TABLE users (
    id            TEXT PRIMARY KEY,          -- Clerk user ID
    email         TEXT NOT NULL,
    name          TEXT,
    avatar_url    TEXT,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);
```

**Access patterns:**
- Upserted by Clerk webhook on sign-up / profile update
- Read by API middleware to resolve user identity

---

### `books`

One row per uploaded EPUB. `user_id` foreign key enforces ownership; all queries filter by `user_id` before returning data.

```sql
CREATE TABLE books (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title           TEXT NOT NULL,
    author          TEXT,
    description     TEXT,
    cover_r2_key    TEXT,                    -- R2 path for cover image
    epub_r2_key     TEXT NOT NULL,           -- R2 path for source EPUB
    language        TEXT DEFAULT 'en',
    status          TEXT NOT NULL DEFAULT 'uploaded'
                    CHECK (status IN ('uploaded','processing','ready','failed')),
    content_hash    TEXT,                    -- SHA-256 for deduplication
    total_chapters  INTEGER,
    total_word_count INTEGER,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_books_user_id ON books(user_id);
```

**Status transitions:**

```
uploaded → processing → ready
                      ↘ failed
```

**Access patterns:**
- `SELECT * FROM books WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3` — library list
- `SELECT * FROM books WHERE id = $1 AND user_id = $2` — single book (ownership check in one query)
- `UPDATE books SET status = $1 WHERE id = $2` — status updates from Inngest jobs

---

### `chapters`

One row per chapter, created synchronously during EPUB upload (before generation starts). `raw_text` is always populated; `cleaned_text` and `sentences` are populated after the GPT-4o step.

```sql
CREATE TABLE chapters (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id         UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    chapter_number  INTEGER NOT NULL,
    title           TEXT,
    raw_text        TEXT NOT NULL,           -- from epub2 (HTML stripped)
    cleaned_text    TEXT,                    -- after GPT-4o cleanup
    sentences       JSONB,                   -- [{index, text, start_char, end_char}]
    word_count      INTEGER,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(book_id, chapter_number)
);
```

**`sentences` JSONB structure:**
```json
[
  { "index": 0, "text": "It was a bright cold day in April.", "start_char": 0, "end_char": 34 },
  { "index": 1, "text": "The clocks were striking thirteen.", "start_char": 35, "end_char": 68 }
]
```
`start_char` / `end_char` are offsets into `cleaned_text`, used by the alignment step to map TTS word timestamps to sentences.

**Access patterns:**
- `SELECT * FROM chapters WHERE book_id = $1 ORDER BY chapter_number` — full chapter list
- `SELECT * FROM chapters WHERE id = $1` — single chapter fetch for pipeline worker

---

### `audio_jobs`

Tracks TTS generation progress for each chapter. A chapter may have multiple `audio_jobs` over its lifetime (e.g., a retry after failure creates a new job).

```sql
CREATE TABLE audio_jobs (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_id        UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    voice             TEXT NOT NULL DEFAULT 'alloy'
                      CHECK (voice IN ('alloy','echo','fable','onyx','nova','shimmer')),
    status            TEXT NOT NULL DEFAULT 'queued'
                      CHECK (status IN ('queued','running','done','failed')),
    audio_r2_key      TEXT,                  -- populated when done
    alignment_r2_key  TEXT,                  -- populated when done
    duration_sec      FLOAT,
    file_size_bytes   BIGINT,
    error_message     TEXT,
    attempts          INTEGER DEFAULT 0,
    started_at        TIMESTAMPTZ,
    completed_at      TIMESTAMPTZ,
    created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_audio_jobs_chapter ON audio_jobs(chapter_id);
```

**Status transitions:**
```
queued → running → done
               ↘ failed  (error_message populated)
```

**Access patterns:**
- `SELECT * FROM audio_jobs WHERE chapter_id = ANY($1)` — batch status fetch for generation progress polling
- `UPDATE audio_jobs SET status='running', started_at=NOW(), attempts=attempts+1 WHERE id=$1` — job start
- `UPDATE audio_jobs SET status='done', audio_r2_key=$1, alignment_r2_key=$2, duration_sec=$3 WHERE id=$4` — job completion

---

### `playback_states`

Upserted by the player every 5 seconds. The `UNIQUE(user_id, book_id)` constraint means each user has exactly one saved position per book, making upsert semantics natural.

```sql
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
```

**Access pattern:**
```sql
-- Upsert (player saves position)
INSERT INTO playback_states (user_id, book_id, chapter_id, position_sec, playback_speed)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (user_id, book_id)
DO UPDATE SET chapter_id=$3, position_sec=$4, playback_speed=$5, updated_at=NOW();
```

---

## Database Triggers

All tables with `updated_at` use a shared Postgres trigger function to keep the column current automatically — no ORM-level `updated_at` management needed:

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- Applied to: users, books, chapters
CREATE TRIGGER trg_users_updated   BEFORE UPDATE ON users   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_books_updated   BEFORE UPDATE ON books   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_chapters_updated BEFORE UPDATE ON chapters FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

## Drizzle ORM Notes

- Schema definition lives in `src/lib/db/schema.ts`
- Client instantiation (with connection pooling for serverless) in `src/lib/db/client.ts`
- Migrations generated with `pnpm db:generate`, applied with `pnpm db:migrate`
- Drizzle config in `drizzle.config.ts` — reads `NEON_DB_URL`

---

## Multi-tenancy Model

Every read query against `books`, `chapters`, `audio_jobs`, and `playback_states` must include a `user_id` check via the ownership chain:

```
audio_jobs.chapter_id → chapters.book_id → books.user_id = current_user
```

API handlers resolve `user_id` from the Clerk session token, never from a request body parameter. A user querying `/api/v1/books/{id}` that belongs to another user receives a `403 FORBIDDEN` — the book is not 404'd to avoid leaking existence.

---

*Next: [03 — Auth & Security](03-auth-and-security.md)*
