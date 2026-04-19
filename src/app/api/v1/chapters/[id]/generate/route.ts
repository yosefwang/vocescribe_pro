export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db/client';
import { chapters, audioJobs, books } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { inngest } from '@/lib/inngest/client';
import { z } from 'zod';

const generateSingleSchema = z.object({
  voice: z.enum(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']).default('alloy'),
  overwrite_existing: z.boolean().default(false),
});

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

  const { id: chapterId } = await params;

  // Parse body
  let body: z.infer<typeof generateSingleSchema>;
  try {
    const raw = await req.json();
    body = generateSingleSchema.parse(raw);
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

  // Get chapter and verify ownership via book
  const [chapter] = await db
    .select()
    .from(chapters)
    .where(eq(chapters.id, chapterId))
    .limit(1);

  if (!chapter) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Chapter not found.' } },
      { status: 404 },
    );
  }

  const [book] = await db
    .select()
    .from(books)
    .where(eq(books.id, chapter.bookId))
    .limit(1);

  if (!book || book.userId !== userId) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'You do not have access to this chapter.' } },
      { status: 403 },
    );
  }

  // Check for active jobs unless overwrite
  if (!body.overwrite_existing) {
    const activeJobs = await db
      .select({ id: audioJobs.id, status: audioJobs.status })
      .from(audioJobs)
      .where(eq(audioJobs.chapterId, chapterId));

    const hasActive = activeJobs.some(
      (job) => job.status === 'queued' || job.status === 'running',
    );

    if (hasActive) {
      return NextResponse.json(
        { error: { code: 'GENERATION_IN_PROGRESS', message: 'Audio generation is already in progress for this chapter. Use overwrite_existing=true to restart.' } },
        { status: 409 },
      );
    }
  }

  // Create audio job
  const [job] = await db
    .insert(audioJobs)
    .values({
      chapterId,
      voice: body.voice,
      status: 'queued',
      attempts: 0,
    })
    .returning();

  if (!job) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to create audio job.' } },
      { status: 500 },
    );
  }

  // Send Inngest event
  await inngest.send({
    name: 'audio/chapter.generate',
    data: {
      audioJobId: job.id,
      chapterId,
      userId,
      voice: body.voice,
    },
  });

  // Update book status to processing if not already
  if (book.status !== 'processing') {
    await db
      .update(books)
      .set({ status: 'processing', updatedAt: new Date() })
      .where(eq(books.id, book.id));
  }

  return NextResponse.json(
    {
      message: 'Chapter generation started.',
      job: {
        id: job.id,
        chapterId: job.chapterId,
        voice: job.voice,
        status: job.status,
        createdAt: job.createdAt,
      },
    },
    { status: 202 },
  );
}
