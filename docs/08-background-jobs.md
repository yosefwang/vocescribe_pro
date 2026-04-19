# 08 — Background Jobs

Inngest architecture for durable, retryable audio generation jobs.

---

## Why Inngest

The audio generation pipeline (GPT-4o + TTS per chunk + ffmpeg) takes 30–90 seconds per chapter and involves external API calls that can fail or be rate-limited. Vercel serverless functions time out after 60 seconds (Pro plan). Inngest solves this by:

- Running steps durably — if a step fails, only that step is retried, not the whole function
- Providing per-function concurrency limits without a custom queue
- Offering real-time job visibility in the Inngest dashboard
- Integrating natively with Next.js via a single route handler

---

## Setup

**Client** (`src/lib/inngest/client.ts`):
```typescript
import { Inngest } from 'inngest';

export const inngest = new Inngest({
  id: 'vocescribe',
  eventKey: process.env.INNGEST_EVENT_KEY!,
});
```

**Serve route** (`src/app/api/inngest/route.ts`):
```typescript
import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest/client';
import { generateChapterAudio } from '@/lib/inngest/functions';

export const { GET, POST, PUT } = serve({ client: inngest, functions: [generateChapterAudio] });
```

---

## Job: `generate-chapter-audio`

**Module:** `src/lib/inngest/functions.ts`

```typescript
export const generateChapterAudio = inngest.createFunction(
  {
    id: 'generate-chapter-audio',
    concurrency: [
      { limit: 3, key: 'event.data.userId' },   // max 3 chapters per user
      { limit: 10 },                             // max 10 chapters globally
    ],
    retries: 3,
  },
  { event: 'audio/chapter.generate' },
  async ({ event, step }) => {
    const { chapterId, audioJobId, userId, voice } = event.data;

    // Step 1: Mark job as running
    await step.run('mark-running', async () => {
      await db.update(audioJobs).set({ status: 'running', startedAt: new Date(), attempts: sql`attempts + 1` })
        .where(eq(audioJobs.id, audioJobId));
    });

    // Step 2: GPT-4o text cleanup
    const { cleanedText, sentences } = await step.run('cleanup-text', async () => {
      return cleanChapterText(chapterId);
    });

    // Step 3: Chunk sentences
    const chunks = await step.run('chunk-sentences', async () => {
      return chunkSentences(sentences);
    });

    // Step 4–5: TTS per chunk + alignment mapping
    const processedChunks = await step.run('tts-and-align', async () => {
      return processTtsChunks(chunks, voice);
    });

    // Step 6: Timestamp offsets + concat
    const { mp3Buffer, alignmentJson } = await step.run('concat-and-align', async () => {
      return finalizeAudio(processedChunks);
    });

    // Step 7: Upload to R2
    const { audioKey, alignmentKey } = await step.run('upload-r2', async () => {
      return uploadChapterFiles(userId, chapterId, mp3Buffer, alignmentJson);
    });

    // Step 8: Update DB
    await step.run('mark-done', async () => {
      await db.update(audioJobs).set({
        status: 'done',
        audioR2Key: audioKey,
        alignmentR2Key: alignmentKey,
        durationSec: alignmentJson.total_duration_sec,
        completedAt: new Date(),
      }).where(eq(audioJobs.id, audioJobId));
    });
  }
);
```

---

## Event Schema

**Trigger:** `POST /api/v1/books/{bookId}/generate` sends one event per chapter:

```typescript
await inngest.send({
  name: 'audio/chapter.generate',
  data: {
    audioJobId: job.id,
    chapterId:  chapter.id,
    bookId:     book.id,
    userId:     userId,
    voice:      requestBody.voice,
  },
});
```

Each chapter is an independent event — failures in chapter 3 do not affect chapters 4–23.

---

## Concurrency Model

```
User A generates 10-chapter book:
  → 3 chapters run immediately (limit: 3 per userId)
  → 7 chapters queue until a slot opens

User B also generates simultaneously:
  → User B gets up to 3 more slots (separate userId key)
  → Global limit: 10 total across all users
```

If the global limit is reached, new events are queued by Inngest and processed in order as slots free up.

---

## Retry Behavior

Inngest retries the entire function on failure (up to 3 times). Because steps are memoized, completed steps are not re-executed:

```
Attempt 1:
  ✓ mark-running
  ✓ cleanup-text
  ✗ tts-and-align  ← fails (OpenAI rate limit)

Attempt 2 (automatic retry after backoff):
  → mark-running   (skipped — already done)
  → cleanup-text   (skipped — already done)
  ✓ tts-and-align  ← succeeds
  ✓ concat-and-align
  ✓ upload-r2
  ✓ mark-done
```

After 3 failed attempts, Inngest marks the function as permanently failed and the DB job is updated to `status='failed'` with `error_message`.

---

## Manual Retry

Users can retry a failed chapter via `POST /audio/{id}/retry`. This creates a new `audio_job` row and sends a new `audio/chapter.generate` event. The old failed job record is preserved for debugging.

---

## Job Status Polling

The frontend polls `GET /books/{bookId}/generate/status` every 3 seconds during active generation. The API query joins `chapters` with their latest `audio_jobs` row:

```sql
SELECT DISTINCT ON (c.id)
  c.chapter_number,
  c.title,
  j.status,
  j.error_message
FROM chapters c
LEFT JOIN audio_jobs j ON j.chapter_id = c.id
WHERE c.book_id = $1
ORDER BY c.id, j.created_at DESC;
```

Polling stops when `summary.running + summary.queued = 0`.

---

## Local Development

Run the Inngest dev server alongside `pnpm dev`:

```bash
npx inngest-cli@latest dev -u http://localhost:3000/api/inngest
```

The dev server proxies events to your local Next.js app and provides a real-time UI at `http://localhost:8288` showing function runs, step-by-step state, and retries.

---

*Next: [09 — Lyric-Sync Player](09-lyric-sync-player.md)*
