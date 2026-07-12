// =============================================================
// API: /api/emission-factors — GET list, POST create
// OWNER: Mitesh
// Permissions: read = all roles, create = ADMIN | ESG_MANAGER
// =============================================================
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/server/api-helpers'
import { requirePermission } from '@/server/permissions'
import { emissionFactorSchema } from '@/server/validators/env'
import {
  listEmissionFactors,
  createEmissionFactor,
} from '@/server/services/env/emission-factors'

export const GET = withAuth(async (_req: NextRequest, ctx: any) => {
  requirePermission(ctx.session, 'emissionFactor', 'read')
  const data = await listEmissionFactors()
  return NextResponse.json(data)
})

export const POST = withAuth(async (req: NextRequest, ctx: any) => {
  // Spec: create = ADMIN | ESG_MANAGER
  const role = (ctx.session.user as any).role
  if (!['ADMIN', 'ESG_MANAGER'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const body = await req.json()
  const data = emissionFactorSchema.parse(body)
  const created = await createEmissionFactor(data)
  return NextResponse.json(created, { status: 201 })
})
