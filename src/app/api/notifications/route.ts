import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/server/api-helpers'
import { db } from '@/db'
import { notifications } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'

// GET /api/notifications → the caller's own latest 15, plus unread count.
export const GET = withAuth(async (_req: NextRequest, ctx?: any) => {
  const userId = ctx.session.user.id

  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(15)

  const unread = rows.filter((n) => !n.read).length

  return NextResponse.json({ notifications: rows, unread })
})
