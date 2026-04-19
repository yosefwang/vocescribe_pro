import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db/client';
import { audioJobs, chapters, books } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(
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

  // Get job and verify ownership
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

  if (!job.alignmentR2Key) {
    return NextResponse.json(
      { error: { code: 'NO_ALIGNMENT', message: 'Alignment data has not been generated yet.' } },
      { status: 404 },
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
      { error: { code: 'FORBIDDEN', message: 'You do not have access to this alignment data.' } },
      { status: 403 },
    );
  }

  // Fetch alignment JSON from R2
  const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
  const r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });

  const response = await r2.send(new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: job.alignmentR2Key!,
  }));

  if (!response.Body) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch alignment data from storage.' } },
      { status: 500 },
    );
  }

  const alignmentText = await response.Body.transformToString();
  let alignmentData: any;
  try {
    alignmentData = JSON.parse(alignmentText);
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Alignment data is corrupted.' } },
      { status: 500 },
    );
  }

  return NextResponse.json({
    jobId: job.id,
    chapterId: job.chapterId,
    alignment: alignmentData,
  });
}
