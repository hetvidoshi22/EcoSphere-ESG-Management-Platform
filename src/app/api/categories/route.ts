// =============================================================
// API: /api/categories — GET list, POST create
// OWNER: Mitesh
// Permissions: read = all, create/update/delete = ADMIN
// =============================================================
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/server/api-helpers'
import { requirePermission } from '@/server/permissions'
import { categorySchema } from '@/server/validators/env'
import { listCategories, createCategory } from '@/server/services/env/categories'

export const GET = withAuth(async (_req: NextRequest, ctx: any) => {
  requirePermission(ctx.session, 'category', 'read')
  const data = await listCategories()
  return NextResponse.json(data)
})

export const POST = withAuth(async (req: NextRequest, ctx: any) => {
  requirePermission(ctx.session, 'category', 'create')
  const body = await req.json()
  const data = categorySchema.parse(body)
  const created = await createCategory(data)
  return NextResponse.json(created, { status: 201 })
})
