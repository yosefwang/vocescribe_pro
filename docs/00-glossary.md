# 00 — Glossary

Domain-specific terms used throughout the Vocescribe codebase and documentation.

---

## A

**Alignment JSON** (`ch{N}_align.json`)
A file stored on R2 alongside each generated chapter MP3. Maps every sentence to its `start_time` / `end_time` in the audio, enabling the lyric-sync player to highlight the correct sentence at any playback position. See [06 — TTS Pipeline](06-tts-pipeline.md) for how it is built.

**Audio Job** (`audio_jobs` table row)
A single unit of work representing the TTS generation of one chapter. Has statuses: `queued → running → done / failed`. One `audio_job` per `chapter`.

---

## C

**Chunk**
A substring of a chapter's cleaned text, no longer than ~4 000 characters, that respects sentence boundaries. Chunks are fed individually to the OpenAI TTS API (which has a per-call character limit) and then concatenated.

**Cleaned Text** (`chapters.cleaned_text`)
Chapter text after GPT-4o processing: page numbers/headers/footers removed, OCR artifacts fixed, hyphenated line breaks joined, quotes/dashes normalized.

**Content Hash** (`books.content_hash`)
SHA-256 digest of the raw EPUB binary. Used for deduplication: if a user uploads the same file twice, they are prompted rather than silently charged again.

---

## E

**EPUB**
The source file format users upload. Parsed with the `epub2` npm library to extract metadata (title, author, language), cover image, and chapter text from the OPS spine.

---

## I

**Inngest Function**
A durable, retryable background job managed by Inngest. The primary function is `generate-chapter-audio`, which orchestrates the full pipeline for one chapter. Runs at most 3 concurrently per user.

---

## L

**Lyric Sync**
The core UX feature: as audio plays, the sentence currently being spoken is highlighted in the text display — karaoke-style. Implemented in `hooks/use-lyric-sync.ts` via a binary search over the alignment JSON on each `timeupdate` event.

---

## P

**Playback State** (`playback_states` table row)
Persisted position for a user+book pair: current `chapter_id`, `position_sec`, and `playback_speed`. Upserted every 5 seconds by the player; restored on next open.

---

## R

**R2 Key**
The object path within Cloudflare R2. Convention: `{user_id}/{book_id}/{filename}`. Examples: `{uid}/{bid}/original.epub`, `{uid}/{bid}/cover.jpg`, `{uid}/{bid}/ch3.mp3`, `{uid}/{bid}/ch3_align.json`.

**Raw Text** (`chapters.raw_text`)
The chapter text extracted directly from EPUB HTML, with HTML tags stripped but otherwise unmodified. Preserved so GPT-4o cleaning can always be re-run.

---

## S

**Sentence** (in alignment context)
A discrete text unit produced by GPT-4o sentence splitting. Each sentence carries `index`, `text`, `start_char` / `end_char` (offsets into `cleaned_text`), and after TTS: `start_time` / `end_time` (seconds in the audio).

**Signed URL**
A time-limited (1 hour) pre-authenticated URL for a private R2 object. The `/audio/{id}/stream` endpoint returns a 302 redirect to a signed URL — clients never receive permanent R2 paths.

---

## T

**TTS** (Text-to-Speech)
The OpenAI audio generation API. Models: `gpt-4o-mini-tts` (fast, lower cost) and `tts-1-hd` (higher quality). Returns MP3 audio and word-level timestamps used to build alignment data.

**Timestamp Offset**
When a chapter spans multiple TTS chunks, each chunk's word timestamps start at 0. The offset — cumulative audio duration of all preceding chunks — is added to each timestamp to produce chapter-level absolute times.

---

## V

**Voice**
One of six OpenAI TTS voices: `alloy`, `echo`, `fable`, `onyx`, `nova`, `shimmer`. Selected by the user before generation; stored in `audio_jobs.voice`.
