// =============================================================
// API: /api/product-profiles — GET list, POST create
// OWNER: Mitesh
// Permissions: read = all, create/update = ADMIN | ESG_MANAGER, delete = ADMIN
// =============================================================
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/server/api-helpers'
import { requirePermission } from '@/server/permissions'
import { productProfileSchema } from '@/server/validators/env'
import { listProductProfiles, createProductProfile } from '@/server/services/env/product-profiles'

export const GET = withAuth(async (_req: NextRequest, ctx: any) => {
  requirePermission(ctx.session, 'productProfile', 'read')
  const data = await listProductProfiles()
  return NextResponse.json(data)
})

export const POST = withAuth(async (req: NextRequest, ctx: any) => {
  requirePermission(ctx.session, 'productProfile', 'create')
  const body = await req.json()
  const data = productProfileSchema.parse(body)
  const created = await createProductProfile(data)
  return NextResponse.json(created, { status: 201 })
})
