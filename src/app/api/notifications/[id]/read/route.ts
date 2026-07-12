import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/server/api-helpers'
import { db } from '@/db'
import { notifications } from '@/db/schema'
import { and, eq } from 'drizzle-orm'

// PATCH /api/notifications/[id]/read → mark the caller's own notification read.
export const PATCH = withAuth(async (_req: NextRequest, ctx?: any) => {
  const userId = ctx.session.user.id
  const { id } = await ctx.params

  const updated = await db
    .update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
    .returning({ id: notifications.id })

  if (updated.length === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ ok: true, id: updated[0].id })
})
