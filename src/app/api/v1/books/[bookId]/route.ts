export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db/client';
import { books, chapters, audioJobs } from '@/lib/db/schema';
import { deletePrefix } from '@/lib/storage/r2';
import { eq, desc } from 'drizzle-orm';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ bookId: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
      { status: 401 },
    );
  }

  const { bookId } = await params;

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(bookId)) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Book not found.' } },
      { status: 404 },
    );
  }

  const [book] = await db.select().from(books).where(eq(books.id, bookId)).limit(1);

  if (!book) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Book not found.' } },
      { status: 404 },
    );
  }

  if (book.userId !== userId) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'You do not have access to this book.' } },
      { status: 403 },
    );
  }

  // Get chapters with their latest audio job
  const chapterRows = await db
    .select({
      id: chapters.id,
      chapterNumber: chapters.chapterNumber,
      title: chapters.title,
      wordCount: chapters.wordCount,
      createdAt: chapters.createdAt,
      updatedAt: chapters.updatedAt,
      jobId: audioJobs.id,
      jobVoice: audioJobs.voice,
      jobStatus: audioJobs.status,
      jobDuration: audioJobs.durationSec,
      jobFileSize: audioJobs.fileSizeBytes,
      jobError: audioJobs.errorMessage,
      jobAttempts: audioJobs.attempts,
      jobCreatedAt: audioJobs.createdAt,
    })
    .from(chapters)
    .leftJoin(audioJobs, eq(chapters.id, audioJobs.chapterId))
    .where(eq(chapters.bookId, bookId))
    .orderBy(chapters.chapterNumber, desc(audioJobs.createdAt));

  // Collapse duplicate rows per chapter (from multiple audio jobs) — keep latest job per chapter
  const chaptersMap = new Map<string, Record<string, any>>();
  for (const row of chapterRows) {
    if (!chaptersMap.has(row.id)) {
      chaptersMap.set(row.id, {
        id: row.id,
        chapterNumber: row.chapterNumber,
        title: row.title,
        wordCount: row.wordCount,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        latestJob: row.jobId
          ? {
              id: row.jobId,
              voice: row.jobVoice,
              status: row.jobStatus,
              durationSec: row.jobDuration,
              fileSizeBytes: row.jobFileSize,
              errorMessage: row.jobError,
              attempts: row.jobAttempts,
              createdAt: row.jobCreatedAt,
            }
          : null,
      });
    }
  }

  const completedChapters = Array.from(chaptersMap.values()).filter(
    (ch) => ch.latestJob?.status === 'done',
  ).length;

  return NextResponse.json({
    book: { ...book, completedChapters },
    chapters: Array.from(chaptersMap.values()),
  });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ bookId: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
      { status: 401 },
    );
  }

  const { bookId } = await params;

  const [book] = await db.select().from(books).where(eq(books.id, bookId)).limit(1);

  if (!book) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Book not found.' } },
      { status: 404 },
    );
  }

  if (book.userId !== userId) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'You do not have access to this book.' } },
      { status: 403 },
    );
  }

  // Delete R2 objects for this book
  const r2Prefix = `${userId}/${bookId}/`;
  try {
    await deletePrefix(r2Prefix);
  } catch {
    // Log but don't block — DB cleanup is more important
    console.error(`Failed to delete R2 prefix: ${r2Prefix}`);
  }

  // Delete from DB (cascade handles chapters, audio_jobs, playback_states)
  await db.delete(books).where(eq(books.id, bookId));

  return NextResponse.json({ deleted: true });
}
