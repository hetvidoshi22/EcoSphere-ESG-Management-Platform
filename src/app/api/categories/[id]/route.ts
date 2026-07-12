// =============================================================
// API: /api/categories/[id] — PATCH update, DELETE
// OWNER: Mitesh
// =============================================================
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/server/api-helpers'
import { requirePermission } from '@/server/permissions'
import { categorySchema } from '@/server/validators/env'
import {
  getCategoryById,
  updateCategory,
  deleteCategory,
} from '@/server/services/env/categories'

export const PATCH = withAuth(async (req: NextRequest, ctx: any) => {
  requirePermission(ctx.session, 'category', 'update')
  const id = ctx.params.id as string
  const existing = await getCategoryById(id)
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const data = categorySchema.partial().parse(body)
  const updated = await updateCategory(id, data)
  return NextResponse.json(updated)
})

export const DELETE = withAuth(async (_req: NextRequest, ctx: any) => {
  requirePermission(ctx.session, 'category', 'delete')
  const id = ctx.params.id as string
  const existing = await getCategoryById(id)
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await deleteCategory(id)
  return NextResponse.json({ success: true })
})
