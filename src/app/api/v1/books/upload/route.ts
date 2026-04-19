export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db/client';
import { books, chapters } from '@/lib/db/schema';
import { uploadObject } from '@/lib/storage/r2';
import { parseEpub } from '@/lib/epub/parser';
import { eq, desc, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { createHash } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
      { status: 401 },
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_REQUEST', message: 'Failed to parse form data' } },
      { status: 400 },
    );
  }

  const file = formData.get('file');
  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: { code: 'MISSING_FILE', message: 'No file uploaded. Provide a file in the "file" field.' } },
      { status: 400 },
    );
  }

  // Validate file size (50 MB)
  const MAX_SIZE = 50 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: { code: 'FILE_TOO_LARGE', message: 'File exceeds 50 MB limit.' } },
      { status: 413 },
    );
  }

  // Validate file type
  const validTypes = ['application/epub+zip', 'application/epub'];
  const fileName = file.name.toLowerCase();
  if (!validTypes.includes(file.type) && !fileName.endsWith('.epub')) {
    return NextResponse.json(
      { error: { code: 'INVALID_FILE_TYPE', message: 'Only EPUB files are accepted.' } },
      { status: 400 },
    );
  }

  // Read file buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Compute SHA-256 for dedup
  const contentHash = createHash('sha256').update(buffer).digest('hex');

  // Check for duplicate
  const existing = await db
    .select({ id: books.id })
    .from(books)
    .where(sql`${books.userId} = ${userId} AND ${books.contentHash} = ${contentHash}`)
    .limit(1);

  if (existing.length > 0) {
    return NextResponse.json(
      { error: { code: 'DUPLICATE', message: 'This book has already been uploaded.', bookId: existing[0].id } },
      { status: 409 },
    );
  }

  const bookId = randomUUID();
  const epubR2Key = `${userId}/${bookId}/original.epub`;

  // Upload EPUB to R2
  try {
    await uploadObject(epubR2Key, buffer, 'application/epub+zip');
  } catch (err) {
    console.error('R2 upload error:', err);
    return NextResponse.json(
      { error: { code: 'STORAGE_ERROR', message: 'Failed to upload file to storage.' } },
      { status: 500 },
    );
  }

  // Write to temp file for epub2 parser
  let tmpFilePath: string;
  try {
    const tmpDir = join(tmpdir(), 'vocescribe-uploads');
    await mkdir(tmpDir, { recursive: true });
    tmpFilePath = join(tmpDir, `${bookId}.epub`);
    await writeFile(tmpFilePath, buffer);
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to process uploaded file.' } },
      { status: 500 },
    );
  }

  // Parse EPUB
  let parseResult;
  try {
    parseResult = await parseEpub(tmpFilePath, userId, bookId);
  } catch (err) {
    console.error('EPUB parse error:', err);
    return NextResponse.json(
      { error: { code: 'PARSE_ERROR', message: `Failed to parse EPUB: ${(err as Error).message}` } },
      { status: 422 },
    );
  }

  const { metadata, coverR2Key, chapters: chapterDrafts } = parseResult;
  const totalWordCount = chapterDrafts.reduce((sum, ch) => sum + ch.wordCount, 0);

  // Insert book and chapters in a transaction
  try {
    await db.transaction(async (tx) => {
      const [insertedBook] = await tx
        .insert(books)
        .values({
          id: bookId,
          userId,
          title: metadata.title,
          author: metadata.author,
          description: metadata.description,
          coverR2Key,
          epubR2Key,
          language: metadata.language,
          contentHash,
          totalChapters: chapterDrafts.length,
          totalWordCount,
        })
        .returning();

      if (chapterDrafts.length > 0) {
        await tx.insert(chapters).values(
          chapterDrafts.map((ch) => ({
            bookId,
            chapterNumber: ch.chapterNumber,
            title: ch.title,
            rawText: ch.rawText,
            wordCount: ch.wordCount,
          })),
        );
      }
    });
  } catch (err) {
    console.error('DB transaction error:', err);
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: 'Failed to save book to database.' } },
      { status: 500 },
    );
  }

  // Fetch the created book to return
  const [createdBook] = await db.select().from(books).where(eq(books.id, bookId));

  return NextResponse.json(
    {
      book: createdBook,
      chapters: chapterDrafts.length,
    },
    { status: 201 },
  );
}
