# 05 — EPUB Pipeline

How Vocescribe processes an uploaded EPUB file from raw bytes to structured database records.

---

## Overview

```
Client uploads file
  │
  ▼
POST /api/v1/books/upload
  │
  ├─ Validate: content-type, file size (≤ 50 MB)
  ├─ Compute SHA-256 content hash (dedup check)
  ├─ Upload original.epub → R2
  │
  ├─ Parse with epub2:
  │    ├─ Extract metadata (title, author, language, description)
  │    ├─ Extract cover image → R2
  │    └─ Walk spine/TOC → extract chapter text
  │
  ├─ Write to DB:
  │    ├─ INSERT books (status='uploaded')
  │    └─ INSERT chapters × N (raw_text, word_count)
  │
  └─ Return book object to client (sync, no background job yet)
```

---

## File Validation

Before any parsing, the route handler validates:

1. **MIME type:** `Content-Type` must be `application/epub+zip`. Files uploaded with the wrong type return `415 INVALID_FILE_TYPE`.
2. **Size:** Body must not exceed 50 MB. Returns `413 FILE_TOO_LARGE`.
3. **EPUB signature:** epub2 opens the file; if it cannot parse a valid OPS package, the book is rejected with `415 INVALID_FILE_TYPE`.

---

## Deduplication via SHA-256

```typescript
const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

const existing = await db.query.books.findFirst({
  where: and(eq(books.userId, userId), eq(books.contentHash, hash))
});

if (existing) {
  return Response.json(
    { error: { code: 'DUPLICATE_BOOK' }, existing_book_id: existing.id, duplicate: true },
    { status: 409 }
  );
}
```

The hash is computed over the raw binary before any processing — two files that differ by even one byte (different DRM strip, different download) will not deduplicate.

---

## R2 Storage (Upload Step)

The original EPUB is uploaded to R2 **before** parsing, so the source file is always preserved regardless of parse failures:

```
{userId}/{bookId}/original.epub
```

Cover image extraction happens during parsing; if found, the cover is re-encoded as JPEG via `sharp` and uploaded to:

```
{userId}/{bookId}/cover.jpg
```

See [07 — Audio Storage](07-audio-storage.md) for the full R2 path convention.

---

## Parsing with `epub2`

The `epub2` library parses the OPS (Open Packaging Specification) package document:

### Metadata Extraction

```typescript
const book = await EPub.createAsync(tempFilePath);

const metadata = {
  title:    book.metadata.title    ?? 'Untitled',
  author:   book.metadata.creator  ?? null,
  language: book.metadata.language ?? 'en',
  description: book.metadata.description ?? null,
};
```

### Cover Extraction

```typescript
// epub2 exposes cover image ID via book.metadata.cover
const [coverBuffer] = await book.getImageAsync(book.metadata.cover);
const jpegBuffer = await sharp(coverBuffer).jpeg({ quality: 85 }).toBuffer();
// upload jpegBuffer to R2
```

### Chapter Extraction (Spine Walk)

epub2's `flow` array represents the spine — the ordered reading sequence. Each spine item is an HTML document:

```typescript
const chapters: ChapterDraft[] = [];

for (let i = 0; i < book.flow.length; i++) {
  const item = book.flow[i];
  const html = await book.getChapterAsync(item.id);

  // Strip HTML tags → raw text
  const rawText = stripHtml(html);
  if (rawText.trim().length < 50) continue; // skip nav/toc pages

  const wordCount = rawText.split(/\s+/).filter(Boolean).length;
  const title = resolveChapterTitle(book, item, i);

  chapters.push({
    chapterNumber: chapters.length + 1,
    title,
    rawText,
    wordCount,
  });
}
```

**Title resolution priority:** TOC label → EPUB manifest title attribute → `Chapter {N}`.

---

## Database Write

After successful parse, records are written in a transaction:

```typescript
await db.transaction(async (tx) => {
  const [book] = await tx.insert(books).values({
    id: newBookId,
    userId,
    title: metadata.title,
    author: metadata.author,
    epubR2Key: epubKey,
    coverR2Key: coverKey,
    contentHash: hash,
    totalChapters: chapters.length,
    totalWordCount: chapters.reduce((sum, c) => sum + c.wordCount, 0),
    status: 'uploaded',
  }).returning();

  await tx.insert(chaptersTable).values(
    chapters.map((c) => ({ ...c, bookId: book.id }))
  );
});
```

The transaction ensures chapters are never orphaned if the book insert fails.

---

## Failure Modes

| Failure | Behavior |
|---|---|
| File too large | Rejected before upload; R2 write never occurs |
| Invalid EPUB structure | epub2 throws; DB write never occurs |
| Cover missing | Skipped; `cover_r2_key` remains null |
| Empty chapters (nav pages) | Filtered out (< 50 char threshold) |
| R2 upload failure | Returns 500; DB write does not proceed |
| Partial spine items (DRM) | Logged; affected chapters may have `raw_text: ''` |

---

## EPUB Format Caveats

- **DRM-protected EPUBs** (Adobe Digital Editions, Kindle): epub2 can open the package but chapter content will be encrypted binary. These files are rejected early with a clear error message.
- **Fixed-layout EPUBs** (comics, children's books): text content may be absent or minimal. Word count check catches these.
- **Multi-file chapters:** Some EPUBs split a single logical chapter across multiple spine items. The parser treats each spine item as a separate chapter; the user sees more chapters than expected.

---

*Next: [06 — TTS Pipeline](06-tts-pipeline.md)*
