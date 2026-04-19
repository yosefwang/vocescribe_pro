export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db/client';
import { books, chapters, audioJobs } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { inngest } from '@/lib/inngest/client';
import { z } from 'zod';

const generateBodySchema = z.object({
  voice: z.enum(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']).default('alloy'),
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
  if (!body.overwrite_existing) {
    const chapterIds = targetChapters.map((ch) => ch.id);
    const activeJobs = await db
      .select({ id: audioJobs.id, status: audioJobs.status, chapterId: audioJobs.chapterId })
      .from(audioJobs)
      .where(inArray(audioJobs.chapterId, chapterIds));

    const hasActive = activeJobs.some(
      (job) => job.status === 'queued' || job.status === 'running',
    );

    if (hasActive) {
      return NextResponse.json(
        { error: { code: 'GENERATION_IN_PROGRESS', message: 'Audio generation is already in progress for some chapters. Use overwrite_existing=true to restart.' } },
        { status: 409 },
      );
    }
  }

  // Create audio jobs and dispatch Inngest events
  const createdJobs: { jobId: string; chapterId: string; chapterNumber: number }[] = [];

  await db.transaction(async (tx) => {
    for (const chapter of targetChapters) {
      const [job] = await tx
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
  });

  // Send Inngest events for each job
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

  // Update book status to processing
  await db
    .update(books)
    .set({ status: 'processing', updatedAt: new Date() })
    .where(eq(books.id, bookId));

  return NextResponse.json(
    {
      message: 'Generation started.',
      jobs: createdJobs,
      totalJobs: createdJobs.length,
    },
    { status: 202 },
  );
}
