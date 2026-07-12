// =============================================================
// API: /api/goals — GET list, POST create
// OWNER: Mitesh
// Permissions: read = all, create = ADMIN | ESG_MANAGER
// =============================================================
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/server/api-helpers'
import { requirePermission } from '@/server/permissions'
import { goalSchema } from '@/server/validators/env'
import { listGoals, createGoal } from '@/server/services/env/goals'

export const GET = withAuth(async (_req: NextRequest, ctx: any) => {
  requirePermission(ctx.session, 'goal', 'read')
  const data = await listGoals()
  return NextResponse.json(data)
})

export const POST = withAuth(async (req: NextRequest, ctx: any) => {
  requirePermission(ctx.session, 'goal', 'create')
  const body = await req.json()
  const data = goalSchema.parse(body)
  const created = await createGoal(data)
  return NextResponse.json(created, { status: 201 })
})
