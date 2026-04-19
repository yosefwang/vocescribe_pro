# 10 — Testing & Eval

Testing strategy, test types, and the TTS quality evaluation suite.

---

## Testing Pyramid

```
              ╱╲
             ╱  ╲           E2E (Playwright)
            ╱    ╲          full user flows in a real browser
           ╱──────╲
          ╱ Integ  ╲        Integration (Vitest)
         ╱          ╲       API handlers + mocked OpenAI
        ╱────────────╲
       ╱  Unit Tests  ╲     Unit (Vitest)
      ╱                ╲    pure functions: chunker, alignment, parser
     ╱──────────────────╲
```

**Commands:**

```bash
pnpm test                   # all tests
pnpm test:unit              # Vitest unit tests
pnpm test:integration       # Vitest integration tests
pnpm test:unit -- --run src/lib/tts/chunker.test.ts   # single file
pnpm test:unit -- --watch   # watch mode
pnpm eval:run               # TTS quality eval (costs OpenAI credits)
pnpm eval:check             # assert eval results against thresholds
```

---

## Unit Tests

**Framework:** Vitest. Pure functions only — no network, no DB, no file I/O.

| Module | What is tested |
|---|---|
| `src/lib/tts/chunker.ts` | Sentence boundary preservation; 4 000 char limit; single-sentence chapters; empty input |
| `src/lib/tts/alignment.ts` | Word→sentence timestamp mapping; multi-chunk offset accumulation; gaps between sentences |
| `src/lib/epub/parser.ts` | Sample EPUB fixture → expected chapter count, title, author, word count, cover presence |
| `src/lib/storage/r2.ts` | Upload/download/delete with mocked S3 client (using `aws-sdk-client-mock`) |
| `src/hooks/use-lyric-sync.ts` | `binarySearchSentence` with various timestamps including gaps and edges |

**Example unit test:**

```typescript
// src/lib/tts/chunker.test.ts
import { describe, it, expect } from 'vitest';
import { chunkSentences } from './chunker';

describe('chunkSentences', () => {
  it('keeps sentences under 4000 chars together', () => {
    const sentences = [
      { index: 0, text: 'A'.repeat(1000), start_char: 0,    end_char: 1000 },
      { index: 1, text: 'B'.repeat(1000), start_char: 1001, end_char: 2001 },
      { index: 2, text: 'C'.repeat(1000), start_char: 2002, end_char: 3002 },
    ];
    const chunks = chunkSentences(sentences, 4000);
    expect(chunks).toHaveLength(1);
  });

  it('splits at sentence boundary before 4000 char limit', () => {
    const sentences = [
      { index: 0, text: 'A'.repeat(3000), start_char: 0,    end_char: 3000 },
      { index: 1, text: 'B'.repeat(3000), start_char: 3001, end_char: 6001 },
    ];
    const chunks = chunkSentences(sentences, 4000);
    expect(chunks).toHaveLength(2);
    expect(chunks[0][0].index).toBe(0);
    expect(chunks[1][0].index).toBe(1);
  });
});
```

---

## Integration Tests

**Framework:** Vitest. Tests API route handlers end-to-end with:
- Real Neon test database (`NEON_TEST_DB_URL` env var)
- Mocked OpenAI responses (no actual AI calls)
- Mocked R2 client (`aws-sdk-client-mock`)

| Flow | What is verified |
|---|---|
| Upload EPUB | Real EPUB fixture → DB books + chapters created, R2 upload called with correct key |
| Auth isolation | Request with User A's token cannot read User B's book (expect 403) |
| Generation trigger | POST /generate → audio_jobs rows created, Inngest events sent |
| Status polling | GET /generate/status → correct summary counts per job status |
| Alignment serving | GET /audio/{id}/alignment → alignment JSON from mocked R2 |
| Error scenarios | Oversized file → 413; wrong file type → 415; concurrent generation → 409 |

**Mocking OpenAI:**

```typescript
import { vi } from 'vitest';
vi.mock('@/lib/openai/client', () => ({
  cleanChapterText: vi.fn().mockResolvedValue({
    cleanedText: 'Mocked cleaned text.',
    sentences: [{ index: 0, text: 'Mocked cleaned text.', start_char: 0, end_char: 20 }],
  }),
  generateTtsChunk: vi.fn().mockResolvedValue({
    mp3Buffer: Buffer.from('fake-mp3'),
    words: [{ text: 'Mocked', start: 0.0, end: 0.5, start_char: 0, end_char: 6 }],
  }),
}));
```

---

## E2E Tests (Playwright)

**Scope:** Full user flows in a Chromium browser against the running dev server.

| Flow | Steps |
|---|---|
| Sign in → upload → library | Sign in via Clerk test user → upload sample.epub → assert book appears in library grid |
| Generate → progress → complete | Click "Generate Audiobook" → watch status badges update → assert all chapters reach "done" |
| Play with sync | Open player → press play → assert sentence highlighting changes within 2s |
| Chapter navigation | Click "Next Chapter" → assert URL changes, new chapter loads |
| Delete book | Click delete → confirm → assert book removed from library |

**Run E2E:**
```bash
pnpm exec playwright test              # headless
pnpm exec playwright test --headed    # with browser UI
pnpm exec playwright test --ui        # Playwright UI mode
```

---

## TTS Quality Eval Suite

The eval suite runs against real OpenAI calls and is **not run on every PR** — only on `main` branch pushes and scheduled nightly. It consumes OpenAI credits.

### Test Corpus

10 EPUB files covering:

| # | Type | Why |
|---|---|---|
| 1 | Classic novel | Baseline literary prose |
| 2 | Technical text | Acronyms, code-like text |
| 3 | Non-English (French) | Language detection, TTS quality |
| 4 | Poetry | Short sentences, unusual rhythm |
| 5 | Short (1 chapter) | Edge case: minimal content |
| 6 | Long (50+ chapters) | Scale test |
| 7 | Heavy dialogue | Quote attribution parsing |
| 8 | Academic paper | Citations, footnotes, formal tone |
| 9 | Children's book | Very short sentences |
| 10 | Bad OCR quality | Artifact removal stress test |

### Automated Metrics

| Metric | How Measured | Target |
|---|---|---|
| Sentence boundary accuracy (F1) | GPT-4o sentence splits vs. human-annotated ground truth | ≥ 0.92 |
| Timestamp start drift | `mean(|predicted.start_time - actual.start_time|)` in ms | ≤ 300 ms |
| Timestamp end drift | `mean(|predicted.end_time - actual.end_time|)` in ms | ≤ 500 ms |
| Boundary accuracy | % of sentences where start drift ≤ 200ms | ≥ 90% |
| Audio continuity | Energy-based artifact detection at chunk boundaries | 0 artifacts |
| Silence gaps > 3s | Count of silent segments in generated audio | 0 |

**Evaluation script** (`scripts/eval_alignment.py`):

```python
def eval_alignment(predicted: list[dict], ground_truth: list[dict]) -> dict:
    errors_start = [abs(p['start_time'] - g['start_time'])
                    for p, g in zip(predicted, ground_truth)]
    errors_end   = [abs(p['end_time'] - g['end_time'])
                    for p, g in zip(predicted, ground_truth)]
    boundary_ok  = sum(1 for e in errors_start if e <= 0.2) / len(errors_start)

    return {
        'mean_start_error_ms':   mean(errors_start) * 1000,
        'mean_end_error_ms':     mean(errors_end) * 1000,
        'boundary_accuracy_pct': boundary_ok * 100,
    }
```

`pnpm eval:check` reads the output JSON and exits with code 1 if any metric misses its target, blocking the CI deploy step.

---

## CI Integration

```yaml
# .github/workflows/ci.yml
unit-tests:
  run: pnpm test:unit --coverage

integration-tests:
  needs: unit-tests
  env:
    NEON_DB_URL: ${{ secrets.NEON_TEST_DB_URL }}
    OPENAI_API_KEY: ${{ secrets.OPENAI_TEST_KEY }}
  run: pnpm test:integration

eval-suite:
  needs: integration-tests
  if: github.ref == 'refs/heads/main'   # only on main
  run: pnpm eval:run && pnpm eval:check
```

---

*Next: [11 — Deployment](11-deployment.md)*
