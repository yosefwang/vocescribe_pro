export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db/client';
import { books, chapters, audioJobs } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { inngest } from '@/lib/inngest/client';
import { processChapter } from '@/lib/tts/pipeline';
import { z } from 'zod';

const GEMINI_VOICES = ['Aoede', 'Charon', 'Kore', 'Orus', 'Puck', 'Zephyr'] as const;

const generateBodySchema = z.object({
  voice: z.enum(GEMINI_VOICES).default('Kore'),
  chapters: z.array(z.number().int().positive()).optional(),
  overwrite_existing: z.boolean().default(false),
});

export async function POST(
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

  // Parse and validate body
  let body: z.infer<typeof generateBodySchema>;
  try {
    const raw = await req.json();
    body = generateBodySchema.parse(raw);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: err.errors.map((e) => e.message).join(', ') } },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: { code: 'INVALID_BODY', message: 'Invalid JSON body.' } },
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

  // Get chapters to generate
  let targetChapters = await db
    .select()
    .from(chapters)
    .where(eq(chapters.bookId, bookId))
    .orderBy(chapters.chapterNumber);

  // Filter to specific chapters if requested
  if (body.chapters && body.chapters.length > 0) {
    targetChapters = targetChapters.filter((ch) =>
      body.chapters!.includes(ch.chapterNumber),
    );
  }

  if (targetChapters.length === 0) {
    return NextResponse.json(
      { error: { code: 'NO_CHAPTERS', message: 'No chapters found to generate.' } },
      { status: 400 },
    );
  }

  // Check for active generation jobs unless overwrite is requested
  // Stale check: mark queued/running jobs older than 10 minutes as failed
  if (!body.overwrite_existing) {
    const chapterIds = targetChapters.map((ch) => ch.id);
    const activeJobs = await db
      .select({ id: audioJobs.id, status: audioJobs.status, chapterId: audioJobs.chapterId, createdAt: audioJobs.createdAt })
      .from(audioJobs)
      .where(inArray(audioJobs.chapterId, chapterIds));

    const staleThreshold = new Date(Date.now() - 10 * 60 * 1000);
    const staleJobs = activeJobs.filter(
      (job) =>
        (job.status === 'queued' || job.status === 'running') &&
        new Date(job.createdAt) < staleThreshold,
    );

    // Mark stale jobs as failed
    for (const sj of staleJobs) {
      await db
        .update(audioJobs)
        .set({ status: 'failed', errorMessage: 'Job timed out.' })
        .where(eq(audioJobs.id, sj.id));
    }

    const hasActive = activeJobs.some(
      (job) => job.status === 'queued' || job.status === 'running',
    );

    if (hasActive && staleJobs.length === 0) {
      return NextResponse.json(
        { error: { code: 'GENERATION_IN_PROGRESS', message: 'Audio generation is already in progress. Try again in a few minutes.' } },
        { status: 409 },
      );
    }
  } else {
    // overwrite: mark existing queued/running jobs for these chapters as failed
    const chapterIds = targetChapters.map((ch) => ch.id);
    const existing = await db
      .select({ id: audioJobs.id, status: audioJobs.status })
      .from(audioJobs)
      .where(inArray(audioJobs.chapterId, chapterIds));
    const active = existing.filter((j) => j.status === 'queued' || j.status === 'running');
    for (const j of active) {
      await db
        .update(audioJobs)
        .set({ status: 'failed', errorMessage: 'Superseded by new generation request.' })
        .where(eq(audioJobs.id, j.id));
    }
  }

  // Create audio jobs
  const createdJobs: { jobId: string; chapterId: string; chapterNumber: number }[] = [];

  for (const chapter of targetChapters) {
    const [job] = await db
      .insert(audioJobs)
      .values({
        chapterId: chapter.id,
        voice: body.voice,
        status: 'queued',
        attempts: 0,
      })
      .returning();

    if (job) {
      createdJobs.push({
        jobId: job.id,
        chapterId: chapter.id,
        chapterNumber: chapter.chapterNumber,
      });
    }
  }

  // Update book status to processing
  await db
    .update(books)
    .set({ status: 'processing', updatedAt: new Date() })
    .where(eq(books.id, bookId));

  // Try Inngest first; fall back to direct processing
  let inngestOk = false;
  try {
    for (const job of createdJobs) {
      await inngest.send({
        name: 'audio/chapter.generate',
        data: {
          audioJobId: job.jobId,
          chapterId: job.chapterId,
          userId,
          voice: body.voice,
        },
      });
    }
    inngestOk = true;
  } catch (err) {
    console.warn('Inngest unavailable, processing directly:', err);
  }

  // Direct processing fallback: process each job inline
  if (!inngestOk) {
    for (const job of createdJobs) {
      try {
        await processChapter(job.jobId);
      } catch (err) {
        console.error(`Direct processing failed for job ${job.jobId}:`, err);
      }
    }

    // Check if all chapters are done to update book status
    const allJobs = await db
      .select({ status: audioJobs.status })
      .from(audioJobs)
      .where(inArray(audioJobs.chapterId, createdJobs.map((j) => j.chapterId)));
    const allDone = allJobs.length > 0 && allJobs.every((j) => j.status === 'done');
    if (allDone) {
      await db
        .update(books)
        .set({ status: 'ready', updatedAt: new Date() })
        .where(eq(books.id, bookId));
    }
  }

  return NextResponse.json(
    {
      message: inngestOk ? 'Generation queued.' : 'Generation complete.',
      jobs: createdJobs,
      totalJobs: createdJobs.length,
      directProcessing: !inngestOk,
    },
    { status: 202 },
  );
}
