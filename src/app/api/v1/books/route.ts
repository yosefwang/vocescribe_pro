export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db/client';
import { books } from '@/lib/db/schema';
import { eq, desc, sql } from 'drizzle-orm';

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
      { status: 401 },
    );
  }

  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 20));
  const status = url.searchParams.get('status');
  const sort = url.searchParams.get('sort') || 'newest';

  const conditions = [eq(books.userId, userId)];
  if (status) {
    conditions.push(eq(books.status, status as any));
  }

  const whereClause = sql.join(conditions, sql` AND `);

  const offset = (page - 1) * limit;

  const [userBooks, countResult] = await Promise.all([
    db
      .select()
      .from(books)
      .where(whereClause)
      .orderBy(
        sort === 'oldest'
          ? books.createdAt
          : sort === 'title'
            ? books.title
            : desc(books.createdAt),
      )
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(books)
      .where(whereClause),
  ]);

  const total = countResult[0]?.count ?? 0;

  return NextResponse.json({
    books: userBooks,
    pagination: {
      page,
      limit,
      total,
    },
  });
}
