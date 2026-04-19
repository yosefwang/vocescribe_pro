export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { Webhook } from 'svix';

export async function POST(req: Request) {
  // Verify Clerk webhook signature using Svix
  const svixId = req.headers.get('svix-id');
  const svixTimestamp = req.headers.get('svix-timestamp');
  const svixSignature = req.headers.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json(
      { error: { code: 'INVALID_SIGNATURE', message: 'Missing Svix headers.' } },
      { status: 400 },
    );
  }

  const body = await req.text();

  const webhookSecret = process.env.CLERK_SECRET_KEY;
  if (!webhookSecret) {
    console.error('CLERK_SECRET_KEY is not set.');
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Webhook secret not configured.' } },
      { status: 500 },
    );
  }

  let payload: any;
  try {
    const wh = new Webhook(webhookSecret);
    payload = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    });
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_SIGNATURE', message: 'Webhook signature verification failed.' } },
      { status: 400 },
    );
  }

  const eventType = payload.type as string;
  const eventData = payload.data as Record<string, any>;

  try {
    switch (eventType) {
      case 'user.created':
      case 'user.updated': {
        const clerkUserId = eventData.id;
        const email = eventData.email_addresses?.[0]?.email_address ?? '';
        const name = [eventData.first_name, eventData.last_name].filter(Boolean).join(' ') || null;
        const avatarUrl = eventData.image_url ?? null;

        const existing = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.id, clerkUserId))
          .limit(1);

        if (existing.length > 0) {
          await db
            .update(users)
            .set({
              email,
              name,
              avatarUrl,
              updatedAt: new Date(),
            })
            .where(eq(users.id, clerkUserId));
        } else {
          await db.insert(users).values({
            id: clerkUserId,
            email,
            name,
            avatarUrl,
          });
        }
        break;
      }

      case 'user.deleted': {
        const clerkUserId = eventData.id;
        await db.delete(users).where(eq(users.id, clerkUserId));
        break;
      }

      default:
        console.log(`Unhandled Clerk webhook event: ${eventType}`);
    }
  } catch (err) {
    console.error(`Error handling Clerk webhook ${eventType}:`, err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to process webhook.' } },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}
