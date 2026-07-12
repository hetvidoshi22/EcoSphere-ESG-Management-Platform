// =============================================================
// API: /api/product-profiles/[id] — PATCH update, DELETE
// OWNER: Mitesh
// =============================================================
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/server/api-helpers'
import { requirePermission } from '@/server/permissions'
import { productProfileSchema } from '@/server/validators/env'
import {
  getProductProfileById,
  updateProductProfile,
  deleteProductProfile,
} from '@/server/services/env/product-profiles'

export const PATCH = withAuth(async (req: NextRequest, ctx: any) => {
  requirePermission(ctx.session, 'productProfile', 'update')
  const id = ctx.params.id as string
  const existing = await getProductProfileById(id)
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const data = productProfileSchema.partial().parse(body)
  const updated = await updateProductProfile(id, data)
  return NextResponse.json(updated)
})

export const DELETE = withAuth(async (_req: NextRequest, ctx: any) => {
  requirePermission(ctx.session, 'productProfile', 'delete')
  const id = ctx.params.id as string
  const existing = await getProductProfileById(id)
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await deleteProductProfile(id)
  return NextResponse.json({ success: true })
})
