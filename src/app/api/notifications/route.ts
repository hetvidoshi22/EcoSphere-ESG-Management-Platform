import { NextResponse } from 'next/server'
import { desc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { notifications } from '@/db/schema'
import { withAuth } from '@/server/api-helpers'
import { sessionUser } from '@/server/errors'

export const GET = withAuth(async (_req, ctx) => {
  const user = sessionUser(ctx.session)
  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(20)
  return NextResponse.json(rows)
})

/** Mark all of the current user's notifications as read. */
export const PATCH = withAuth(async (_req, ctx) => {
  const user = sessionUser(ctx.session)
  await db
    .update(notifications)
    .set({ read: true })
    .where(eq(notifications.userId, user.id))
  return NextResponse.json({ ok: true })
})
