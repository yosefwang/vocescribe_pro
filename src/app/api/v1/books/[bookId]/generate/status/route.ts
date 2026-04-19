export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db/client';
import { books, chapters, audioJobs } from '@/lib/db/schema';
import { eq, desc, sql } from 'drizzle-orm';

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

  // Get all chapters for this book
  const allChapters = await db
    .select({
      id: chapters.id,
      chapterNumber: chapters.chapterNumber,
      title: chapters.title,
    })
    .from(chapters)
    .where(eq(chapters.bookId, bookId))
    .orderBy(chapters.chapterNumber);

  // Get the latest audio job per chapter using a subquery approach
  // First get all jobs, then deduplicate in JS
  const allJobs = await db
    .select({
      id: audioJobs.id,
      chapterId: audioJobs.chapterId,
      voice: audioJobs.voice,
      status: audioJobs.status,
      durationSec: audioJobs.durationSec,
      fileSizeBytes: audioJobs.fileSizeBytes,
      errorMessage: audioJobs.errorMessage,
      attempts: audioJobs.attempts,
      createdAt: audioJobs.createdAt,
      startedAt: audioJobs.startedAt,
      completedAt: audioJobs.completedAt,
    })
    .from(audioJobs)
    .where(
      eq(audioJobs.chapterId, sql`(SELECT id FROM ${chapters} WHERE ${chapters.bookId} = ${bookId})`),
    )
    .orderBy(desc(audioJobs.createdAt));

  // Build a map of latest job per chapter
  const latestJobMap = new Map<string, typeof allJobs[0]>();
  for (const job of allJobs) {
    if (!latestJobMap.has(job.chapterId)) {
      latestJobMap.set(job.chapterId, job);
    }
  }

  // Build chapter status list
  const chapterStatuses = allChapters.map((ch) => {
    const job = latestJobMap.get(ch.id);
    return {
      chapterNumber: ch.chapterNumber,
      title: ch.title,
      jobId: job?.id ?? null,
      status: job?.status ?? 'not_started',
      durationSec: job?.durationSec ?? null,
      fileSizeBytes: job?.fileSizeBytes ?? null,
      errorMessage: job?.errorMessage ?? null,
      attempts: job?.attempts ?? 0,
      startedAt: job?.startedAt ?? null,
      completedAt: job?.completedAt ?? null,
    };
  });

  // Compute summary
  const summary = {
    queued: 0,
    running: 0,
    done: 0,
    failed: 0,
    not_started: 0,
  };

  for (const ch of chapterStatuses) {
    const status = ch.status as keyof typeof summary;
    if (status in summary) {
      summary[status]++;
    } else {
      summary.not_started++;
    }
  }

  // Determine overall book status
  const bookStatus =
    summary.running > 0 || summary.queued > 0
      ? 'processing'
      : summary.failed > 0
        ? 'failed'
        : summary.done === allChapters.length
          ? 'ready'
          : book.status;

  return NextResponse.json({
    bookId,
    bookStatus,
    total_chapters: allChapters.length,
    summary,
    chapters: chapterStatuses,
  });
}
