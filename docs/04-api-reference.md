# 04 — API Reference

All endpoints under `/api/v1`. Every request requires a valid Clerk Bearer token unless noted.

**Authentication header:**
```
Authorization: Bearer <clerk_session_token>
```

**Base URL:** `/api/v1`

**Response envelope for errors:**
```json
{ "error": { "code": "ERROR_CODE", "message": "Human-readable message." } }
```

---

## Books

### `GET /books`

List the authenticated user's books.

**Query parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | integer | `1` | Page number |
| `limit` | integer | `20` | Items per page (max 100) |
| `status` | string | — | Filter: `uploaded` \| `processing` \| `ready` \| `failed` |
| `sort` | string | `created_at_desc` | `title_asc` \| `title_desc` \| `created_at_desc` \| `generated_at_desc` \| `author_asc` |

**Response `200`:**
```json
{
  "books": [
    {
      "id": "uuid",
      "title": "1984",
      "author": "George Orwell",
      "cover_url": "https://r2.example.com/signed-url",
      "status": "ready",
      "total_chapters": 23,
      "total_word_count": 88926,
      "created_at": "2026-04-18T10:00:00Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 47 }
}
```

---

### `POST /books/upload`

Upload an EPUB file. `multipart/form-data`, field name `file`, max 50 MB.

Synchronous: parses EPUB, creates DB records, and returns immediately. Audio generation is a separate step.

**Response `201`:**
```json
{
  "id": "uuid",
  "title": "1984",
  "author": "George Orwell",
  "cover_url": "https://r2.example.com/signed-url",
  "total_chapters": 23,
  "total_word_count": 88926,
  "status": "uploaded",
  "chapters": [
    { "chapter_number": 1, "title": "Part One, Chapter 1", "word_count": 3842 }
  ]
}
```

**Errors:** `FILE_TOO_LARGE (413)`, `INVALID_FILE_TYPE (415)`, `INTERNAL_ERROR (500)`

**Deduplication:** If `content_hash` matches an existing book owned by this user, returns `409` with the existing book's `id` and a `duplicate: true` flag.

---

### `GET /books/{id}`

Book metadata, chapter list, and audio generation status for each chapter.

**Response `200`:**
```json
{
  "id": "uuid",
  "title": "1984",
  "author": "George Orwell",
  "description": "...",
  "cover_url": "...",
  "language": "en",
  "status": "processing",
  "total_chapters": 23,
  "total_word_count": 88926,
  "created_at": "2026-04-18T10:00:00Z",
  "chapters": [
    {
      "chapter_number": 1,
      "title": "Part One, Chapter 1",
      "word_count": 3842,
      "audio": {
        "status": "done",
        "voice": "alloy",
        "duration_sec": 342.5,
        "stream_url": "/api/v1/audio/{jobId}/stream",
        "alignment_url": "/api/v1/audio/{jobId}/alignment"
      }
    },
    {
      "chapter_number": 2,
      "title": "Part One, Chapter 2",
      "word_count": 4100,
      "audio": { "status": "queued" }
    }
  ]
}
```

**Errors:** `BOOK_NOT_FOUND (404)`, `FORBIDDEN (403)`

---

### `DELETE /books/{id}`

Delete the book, all chapters, all audio jobs, and all R2 objects (EPUB, cover, MP3s, alignment JSONs).

**Response `204` No Content**

**Errors:** `BOOK_NOT_FOUND (404)`, `FORBIDDEN (403)`

---

## Chapters

### `GET /books/{bookId}/chapters`

List all chapters with their audio status.

**Response `200`:** Array of chapter objects (same shape as in `GET /books/{id}` chapters array).

---

### `GET /books/{bookId}/chapters/{n}`

Single chapter detail including text preview and full audio metadata.

**Response `200`:**
```json
{
  "id": "uuid",
  "chapter_number": 1,
  "title": "Part One, Chapter 1",
  "word_count": 3842,
  "text_preview": "It was a bright cold day in April, and the clocks were striking thirteen...",
  "audio": {
    "status": "done",
    "voice": "alloy",
    "duration_sec": 342.5,
    "stream_url": "/api/v1/audio/{jobId}/stream",
    "alignment_url": "/api/v1/audio/{jobId}/alignment"
  }
}
```

---

## Audio Generation

### `POST /books/{bookId}/generate`

Start audiobook generation. Creates one `audio_job` per chapter and enqueues Inngest jobs.

**Request body:**
```json
{
  "voice": "alloy",
  "chapters": [1, 2, 3],
  "overwrite_existing": false
}
```

| Field | Type | Default | Notes |
|---|---|---|---|
| `voice` | string | required | One of: `alloy` `echo` `fable` `onyx` `nova` `shimmer` |
| `chapters` | number[] | all chapters | Subset to generate; omit for full book |
| `overwrite_existing` | boolean | `false` | If `false`, skips chapters that already have `status: done` |

**Response `202` Accepted:**
```json
{
  "book_id": "uuid",
  "chapters_queued": 23,
  "voice": "alloy"
}
```

**Errors:** `GENERATION_IN_PROGRESS (409)`, `BOOK_NOT_FOUND (404)`, `FORBIDDEN (403)`

---

### `GET /books/{bookId}/generate/status`

Poll generation progress. Frontend polls every 3 seconds during active generation.

**Response `200`:**
```json
{
  "total_chapters": 23,
  "summary": {
    "queued": 2,
    "running": 3,
    "done": 15,
    "failed": 1,
    "not_started": 2
  },
  "chapters": [
    { "chapter_number": 1, "title": "...", "status": "done",    "progress_pct": 100 },
    { "chapter_number": 2, "title": "...", "status": "running", "progress_pct": 65 },
    { "chapter_number": 5, "title": "...", "status": "failed",  "error": "TTS rate limit" }
  ]
}
```

---

### `POST /chapters/{id}/generate`

Generate audio for a single chapter (respects the same `voice` and `overwrite_existing` params).

**Response `202`**

---

### `POST /audio/{id}/retry`

Retry a failed audio job.

**Response `202`**

**Errors:** `FORBIDDEN (403)` if job's chapter doesn't belong to user; `409` if already running.

---

## Audio Playback

### `GET /audio/{id}/stream`

Redirects (`302`) to a time-limited R2 signed URL for the MP3 file. The client's `<audio>` element follows the redirect and streams directly from R2.

Signed URL expires in **1 hour**.

---

### `GET /audio/{id}/download`

Returns the MP3 file as a direct download (`Content-Disposition: attachment`).

---

### `GET /audio/{id}/alignment`

Returns the full alignment JSON for the chapter. Used by the player on chapter load.

**Response `200`:**
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
    }
  ]
}
```

---

## Playback State

### `GET /books/{bookId}/playback`

Get the saved playback position for the authenticated user.

**Response `200`:**
```json
{
  "chapter_id": "uuid",
  "chapter_number": 3,
  "position_sec": 145.3,
  "playback_speed": 1.25,
  "updated_at": "2026-04-18T12:00:00Z"
}
```

Returns `null` body if no saved state exists for this book.

---

### `PUT /books/{bookId}/playback`

Save playback position (called by the player every 5 seconds).

**Request body:**
```json
{
  "chapter_id": "uuid",
  "position_sec": 145.3,
  "playback_speed": 1.25
}
```

**Response `204` No Content**

---

## Webhooks

### `POST /api/webhooks/clerk`

Clerk-to-server webhook for user lifecycle events. Not part of `/api/v1`. Validates `Svix-Id`, `Svix-Timestamp`, `Svix-Signature` headers using the Clerk webhook secret.

Handles: `user.created`, `user.updated`, `user.deleted`.

---

*Next: [05 — EPUB Pipeline](05-epub-pipeline.md)*
