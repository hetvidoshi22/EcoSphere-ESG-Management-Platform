import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/server/api-helpers'
import { requirePermission } from '@/server/permissions'
import { db } from '@/db'
import { departments } from '@/db/schema'
import { and, eq, ne } from 'drizzle-orm'
import { departmentUpdateSchema } from '@/server/validators/platform'

// PATCH /api/departments/[id] → update (ADMIN). Keeps code unique.
export const PATCH = withAuth(async (req: NextRequest, ctx?: any) => {
  requirePermission(ctx.session, 'department', 'update')
  const { id } = await ctx.params

  const body = departmentUpdateSchema.parse(await req.json())

  if (body.code) {
    const clash = await db
      .select({ id: departments.id })
      .from(departments)
      .where(and(eq(departments.code, body.code), ne(departments.id, id)))
      .limit(1)
    if (clash.length > 0) {
      return NextResponse.json({ error: 'Code already in use' }, { status: 409 })
    }
  }

  const [updated] = await db
    .update(departments)
    .set({
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.code !== undefined ? { code: body.code } : {}),
      ...(body.headId !== undefined ? { headId: body.headId } : {}),
      ...(body.parentId !== undefined ? { parentId: body.parentId } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
    })
    .where(eq(departments.id, id))
    .returning()

  if (!updated) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json(updated)
})

// DELETE /api/departments/[id] → delete (ADMIN).
export const DELETE = withAuth(async (_req: NextRequest, ctx?: any) => {
  requirePermission(ctx.session, 'department', 'delete')
  const { id } = await ctx.params

  const deleted = await db
    .delete(departments)
    .where(eq(departments.id, id))
    .returning({ id: departments.id })

  if (deleted.length === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json({ ok: true, id })
})
