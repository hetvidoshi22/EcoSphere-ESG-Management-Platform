import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/server/api-helpers'
import { requirePermission } from '@/server/permissions'
import { db } from '@/db'
import { departments, users } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import { departmentCreateSchema } from '@/server/validators/platform'

// GET /api/departments → all departments (any authenticated reader) with head name.
export const GET = withAuth(async (_req: NextRequest, ctx?: any) => {
  requirePermission(ctx.session, 'department', 'read')

  const heads = users
  const rows = await db
    .select({
      id: departments.id,
      name: departments.name,
      code: departments.code,
      headId: departments.headId,
      headName: heads.name,
      parentId: departments.parentId,
      employeeCount: departments.employeeCount,
      status: departments.status,
      createdAt: departments.createdAt,
    })
    .from(departments)
    .leftJoin(heads, eq(departments.headId, heads.id))
    .orderBy(desc(departments.createdAt))

  return NextResponse.json({ departments: rows })
})

// POST /api/departments → create (ADMIN). Enforces unique code.
export const POST = withAuth(async (req: NextRequest, ctx?: any) => {
  requirePermission(ctx.session, 'department', 'create')

  const body = departmentCreateSchema.parse(await req.json())

  const existing = await db
    .select({ id: departments.id })
    .from(departments)
    .where(eq(departments.code, body.code))
    .limit(1)
  if (existing.length > 0) {
    return NextResponse.json({ error: 'Code already in use' }, { status: 409 })
  }

  const [created] = await db
    .insert(departments)
    .values({
      name: body.name,
      code: body.code,
      headId: body.headId ?? null,
      parentId: body.parentId ?? null,
      status: body.status,
    })
    .returning()

  return NextResponse.json(created, { status: 201 })
})
