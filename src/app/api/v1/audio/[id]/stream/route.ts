export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db/client';
import { audioJobs, chapters, books } from '@/lib/db/schema';
import { getSignedDownloadUrl } from '@/lib/storage/r2';
import { eq } from 'drizzle-orm';

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

  if (!job.audioR2Key) {
    return NextResponse.json(
      { error: { code: 'NO_AUDIO', message: 'Audio has not been generated yet.' } },
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
      { error: { code: 'FORBIDDEN', message: 'You do not have access to this audio.' } },
      { status: 403 },
    );
  }

  // Get signed URL and redirect
  const signedUrl = await getSignedDownloadUrl(job.audioR2Key);

  return NextResponse.redirect(signedUrl);
}
