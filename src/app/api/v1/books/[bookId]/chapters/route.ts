export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db/client';
import { books, chapters, audioJobs } from '@/lib/db/schema';
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

  // Verify ownership via book
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

  // Get chapters with latest audio job status
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
      jobCreatedAt: audioJobs.createdAt,
    })
    .from(chapters)
    .leftJoin(audioJobs, eq(chapters.id, audioJobs.chapterId))
    .where(eq(chapters.bookId, bookId))
    .orderBy(chapters.chapterNumber, desc(audioJobs.createdAt));

  // Deduplicate — keep only the latest job per chapter
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
        audioStatus: row.jobStatus ?? 'not_started',
        latestJob: row.jobId
          ? {
              id: row.jobId,
              voice: row.jobVoice,
              status: row.jobStatus,
              durationSec: row.jobDuration,
              fileSizeBytes: row.jobFileSize,
              errorMessage: row.jobError,
              createdAt: row.jobCreatedAt,
            }
          : null,
      });
    }
  }

  return NextResponse.json({
    bookId,
    chapters: Array.from(chaptersMap.values()),
  });
}
