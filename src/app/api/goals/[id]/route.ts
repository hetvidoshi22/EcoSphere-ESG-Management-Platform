// =============================================================
// API: /api/goals/[id] — PATCH update, DELETE
// OWNER: Mitesh
// Permissions: update = ADMIN | ESG_MANAGER, delete = ADMIN
// =============================================================
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/server/api-helpers'
import { requirePermission } from '@/server/permissions'
import { goalSchema } from '@/server/validators/env'
import { getGoalById, updateGoal, deleteGoal } from '@/server/services/env/goals'

export const PATCH = withAuth(async (req: NextRequest, ctx: any) => {
  requirePermission(ctx.session, 'goal', 'update')
  const id = ctx.params.id as string
  const existing = await getGoalById(id)
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const data = goalSchema.partial().parse(body)
  const updated = await updateGoal(id, data)
  return NextResponse.json(updated)
})

export const DELETE = withAuth(async (_req: NextRequest, ctx: any) => {
  requirePermission(ctx.session, 'goal', 'delete')
  const id = ctx.params.id as string
  const existing = await getGoalById(id)
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await deleteGoal(id)
  return NextResponse.json({ success: true })
})
