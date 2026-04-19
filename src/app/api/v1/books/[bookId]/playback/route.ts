export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db/client';
import { books, playbackStates } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const upsertSchema = z.object({
  chapter_id: z.string().uuid(),
  position_sec: z.number().min(0).default(0),
  playback_speed: z.number().min(0.5).max(3.0).default(1.0),
});

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

  // Get playback state
  const [state] = await db
    .select()
    .from(playbackStates)
    .where(and(eq(playbackStates.userId, userId), eq(playbackStates.bookId, bookId)))
    .limit(1);

  if (!state) {
    return NextResponse.json({
      bookId,
      chapterId: null,
      positionSec: 0,
      playbackSpeed: 1.0,
    });
  }

  return NextResponse.json({
    bookId: state.bookId,
    chapterId: state.chapterId,
    positionSec: state.positionSec,
    playbackSpeed: state.playbackSpeed,
    updatedAt: state.updatedAt,
  });
}

export async function PUT(
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

  // Parse and validate body
  let body: z.infer<typeof upsertSchema>;
  try {
    const raw = await req.json();
    body = upsertSchema.parse(raw);
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

  // Upsert playback state
  // First try to find existing
  const [existing] = await db
    .select({ id: playbackStates.id })
    .from(playbackStates)
    .where(and(eq(playbackStates.userId, userId), eq(playbackStates.bookId, bookId)))
    .limit(1);

  if (existing) {
    await db
      .update(playbackStates)
      .set({
        chapterId: body.chapter_id,
        positionSec: body.position_sec,
        playbackSpeed: body.playback_speed,
        updatedAt: new Date(),
      })
      .where(eq(playbackStates.id, existing.id));
  } else {
    await db.insert(playbackStates).values({
      userId,
      bookId,
      chapterId: body.chapter_id,
      positionSec: body.position_sec,
      playbackSpeed: body.playback_speed,
    });
  }

  return NextResponse.json({
    bookId,
    chapterId: body.chapter_id,
    positionSec: body.position_sec,
    playbackSpeed: body.playback_speed,
  });
}
