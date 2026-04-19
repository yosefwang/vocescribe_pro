export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db/client';
import { books, chapters, audioJobs } from '@/lib/db/schema';
import { eq, desc, and } from 'drizzle-orm';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ bookId: string; chapterNumber: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
      { status: 401 },
    );
  }

  const { bookId, chapterNumber: chapterNumStr } = await params;
  const chapterNumber = parseInt(chapterNumStr, 10);

  if (isNaN(chapterNumber) || chapterNumber < 1) {
    return NextResponse.json(
      { error: { code: 'INVALID_PARAM', message: 'chapterNumber must be a positive integer.' } },
      { status: 400 },
    );
  }

  // Verify book ownership
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

  // Fetch chapter
  const [chapter] = await db
    .select()
    .from(chapters)
    .where(and(eq(chapters.bookId, bookId), eq(chapters.chapterNumber, chapterNumber)))
    .limit(1);

  if (!chapter) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Chapter not found.' } },
      { status: 404 },
    );
  }

  // Get latest audio job for this chapter
  const [latestJob] = await db
    .select()
    .from(audioJobs)
    .where(eq(audioJobs.chapterId, chapter.id))
    .orderBy(desc(audioJobs.createdAt))
    .limit(1);

  // Text preview — first 500 characters of cleanedText or rawText
  const fullText = chapter.cleanedText ?? chapter.rawText;
  const textPreview = fullText.slice(0, 500);

  return NextResponse.json({
    chapter: {
      id: chapter.id,
      bookId: chapter.bookId,
      chapterNumber: chapter.chapterNumber,
      title: chapter.title,
      wordCount: chapter.wordCount,
      fullText,
      sentences: chapter.sentences ?? [],
      createdAt: chapter.createdAt,
      updatedAt: chapter.updatedAt,
    },
    audioJob: latestJob
      ? {
          id: latestJob.id,
          voice: latestJob.voice,
          status: latestJob.status,
          durationSec: latestJob.durationSec,
          fileSizeBytes: latestJob.fileSizeBytes,
          errorMessage: latestJob.errorMessage,
          attempts: latestJob.attempts,
          startedAt: latestJob.startedAt,
          completedAt: latestJob.completedAt,
          createdAt: latestJob.createdAt,
        }
      : null,
  });
}
