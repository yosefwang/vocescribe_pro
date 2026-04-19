export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db/client';
import { audioJobs, chapters, books } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { inngest } from '@/lib/inngest/client';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
      { status: 401 },
    );
  }

  const { id: jobId } = await params;

  // Get the failed job
  const [job] = await db
    .select()
    .from(audioJobs)
    .where(eq(audioJobs.id, jobId))
    .limit(1);

  if (!job) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Audio job not found.' } },
      { status: 404 },
    );
  }

  if (job.status !== 'failed') {
    return NextResponse.json(
      { error: { code: 'INVALID_STATE', message: 'Only failed jobs can be retried.' } },
      { status: 400 },
    );
  }

  // Verify ownership through chapter -> book
  const [chapter] = await db
    .select({ bookId: chapters.bookId })
    .from(chapters)
    .where(eq(chapters.id, job.chapterId))
    .limit(1);

  if (!chapter) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Chapter not found.' } },
      { status: 404 },
    );
  }

  const [book] = await db
    .select({ userId: books.userId })
    .from(books)
    .where(eq(books.id, chapter.bookId))
    .limit(1);

  if (!book || book.userId !== userId) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'You do not have access to this audio job.' } },
      { status: 403 },
    );
  }

  // Create a new audio job for retry
  const [newJob] = await db
    .insert(audioJobs)
    .values({
      chapterId: job.chapterId,
      voice: job.voice,
      status: 'queued',
      attempts: 0,
    })
    .returning();

  if (!newJob) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to create retry job.' } },
      { status: 500 },
    );
  }

  // Send Inngest event
  await inngest.send({
    name: 'audio/chapter.generate',
    data: {
      audioJobId: newJob.id,
      chapterId: job.chapterId,
      userId,
      voice: job.voice,
    },
  });

  return NextResponse.json(
    {
      message: 'Retry job created.',
      job: {
        id: newJob.id,
        chapterId: newJob.chapterId,
        voice: newJob.voice,
        status: newJob.status,
        originalJobId: job.id,
        createdAt: newJob.createdAt,
      },
    },
    { status: 202 },
  );
}
