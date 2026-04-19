# 06 — TTS Pipeline

How Vocescribe converts raw chapter text into an MP3 file with per-sentence timestamp alignment.

---

## Pipeline Overview

```
Chapter (raw_text from DB)
  │
  ▼  Step 1: GPT-4o Text Cleanup
  cleaned_text + sentences[] (with char offsets)
  │
  ▼  Step 2: Sentence Chunker
  chunks[] (each ≤ 4 000 chars, sentence boundaries preserved)
  │
  ▼  Step 3: TTS per Chunk (parallel or sequential)
  per chunk: { mp3Buffer, wordTimestamps[] }
  │
  ▼  Step 4: Alignment Mapping
  per chunk: sentences with start_time / end_time
  │
  ▼  Step 5: Timestamp Offset (multi-chunk chapters)
  chapter-level: all timestamps absolute
  │
  ▼  Step 6: ffmpeg Concatenation (if > 1 chunk)
  single ch{N}.mp3
  │
  ▼  Step 7: R2 Upload
  ch{N}.mp3 + ch{N}_align.json
  │
  ▼  DB Update
  audio_jobs: status='done', r2 keys, duration_sec
```

---

## Step 1: GPT-4o Text Cleanup

**Module:** `src/lib/tts/pipeline.ts` (calls `src/lib/openai/client.ts`)

The raw EPUB text contains OCR artifacts, page number markers, header/footer remnants, and poorly normalized punctuation. GPT-4o normalizes the text and produces sentence-level offsets in one pass.

**System prompt:**
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

**Output stored in DB:** `chapters.cleaned_text` and `chapters.sentences` (JSONB).

---

## Step 2: Sentence Chunker

**Module:** `src/lib/tts/chunker.ts`

Splits the `sentences[]` array into groups where the total character count of each group does not exceed ~4 000 characters. Groups respect sentence boundaries — a sentence is never split mid-way.

```typescript
function chunkSentences(sentences: Sentence[], maxChars = 4000): Sentence[][] {
  const chunks: Sentence[][] = [];
  let current: Sentence[] = [];
  let currentLen = 0;

  for (const sentence of sentences) {
    if (currentLen + sentence.text.length > maxChars && current.length > 0) {
      chunks.push(current);
      current = [];
      currentLen = 0;
    }
    current.push(sentence);
    currentLen += sentence.text.length;
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}
```

The `text` fed to TTS for each chunk is the concatenation of sentence texts in that chunk (joined with a space).

---

## Step 3: TTS per Chunk

**Module:** `src/lib/tts/pipeline.ts`

Each chunk is sent to the OpenAI audio API:

```typescript
const response = await openai.audio.speech.create({
  model: 'gpt-4o-mini-tts',   // or 'tts-1-hd' for production quality
  voice: job.voice,            // user-selected: alloy, echo, fable, onyx, nova, shimmer
  input: chunkText,
  response_format: 'mp3',
});

const mp3Buffer = Buffer.from(await response.arrayBuffer());
// word timestamps are in response.headers or a separate timestamps endpoint
// (implementation depends on OpenAI API version at time of build)
```

Word timestamps are extracted from the response and associated with the chunk.

---

## Step 4: Alignment Mapping

**Module:** `src/lib/tts/alignment.ts`

Maps word-level timestamps (from TTS) to sentence-level timestamps (for the player).

**Algorithm:**

For each sentence `s` in the chunk:
1. Find all TTS words where `word.start_char` falls within `[s.start_char, s.end_char]`
2. `s.start_time` = `min(word.start)` of those words
3. `s.end_time` = `max(word.end)` of those words

```typescript
function mapWordsToSentences(
  sentences: Sentence[],
  words: TtsWord[],
  charOffset: number = 0   // offset of chunk's first char in cleaned_text
): AlignedSentence[] {
  return sentences.map((s) => {
    const absStart = s.start_char - charOffset;
    const absEnd   = s.end_char   - charOffset;

    const relevant = words.filter(
      (w) => w.start_char >= absStart && w.start_char < absEnd
    );

    return {
      ...s,
      start_time: relevant.length ? relevant[0].start            : 0,
      end_time:   relevant.length ? relevant[relevant.length-1].end : 0,
    };
  });
}
```

---

## Step 5: Timestamp Offset (multi-chunk)

When a chapter requires more than one TTS chunk, each chunk's timestamps start at 0. The cumulative duration of all preceding chunks is added to produce chapter-absolute timestamps:

```typescript
let offset = 0;
const allAligned: AlignedSentence[] = [];

for (const chunk of processedChunks) {
  chunk.sentences.forEach((s) => {
    allAligned.push({
      ...s,
      start_time: s.start_time + offset,
      end_time:   s.end_time   + offset,
    });
  });
  offset += chunk.durationSec;
}
```

---

## Step 6: Audio Concatenation (multi-chunk)

**Tool:** `ffmpeg` (must be installed in the runtime environment)

When a chapter has more than one chunk, the individual MP3 buffers are written to a temp directory and concatenated with ffmpeg's stream-copy mode (lossless, no re-encoding):

```bash
# filelist.txt
file '/tmp/ch3_chunk0.mp3'
file '/tmp/ch3_chunk1.mp3'
file '/tmp/ch3_chunk2.mp3'

ffmpeg -f concat -safe 0 -i /tmp/filelist.txt -c copy /tmp/ch3_final.mp3
```

Single-chunk chapters skip this step entirely.

---

## Step 7: R2 Upload

Two objects are uploaded per completed chapter:

| Object | R2 Key | Content |
|---|---|---|
| Audio | `{userId}/{bookId}/ch{N}.mp3` | MP3 binary |
| Alignment | `{userId}/{bookId}/ch{N}_align.json` | Alignment JSON |

**Alignment JSON structure:**
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

## Error Handling & Retries

| Error | Strategy |
|---|---|
| OpenAI TTS rate limit (429) | Inngest retries with exponential backoff; job status remains `running` |
| OpenAI TTS error (5xx) | Inngest retries up to 3 times; then `status='failed'`, `error_message` set |
| ffmpeg not found | Hard fail; logged; returned as `INTERNAL_ERROR` |
| R2 upload failure | Retry once; then fail the job |
| GPT-4o cleanup failure | Chapter text cleanup skipped; falls back to `raw_text` for TTS |

Failed chapters are individually retryable via `POST /audio/{id}/retry` without reprocessing the whole book.

---

## Quality Targets

| Metric | Target |
|---|---|
| Sentence boundary accuracy (F1 vs human) | ≥ 0.92 |
| Timestamp drift (mean \|predicted − actual\|) | ≤ 200 ms |
| Audio continuity artifacts at chunk boundaries | 0 |
| Silence gaps > 3s | 0 |

These targets are enforced by the eval suite. See [10 — Testing & Eval](10-testing-and-eval.md).

---

*Next: [07 — Audio Storage](07-audio-storage.md)*
