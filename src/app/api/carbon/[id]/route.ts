// =============================================================
// API: /api/carbon/[id] — PATCH (fields + status advance), DELETE
// OWNER: Mitesh
// Status advance: ADMIN | ESG_MANAGER
// Delete: ADMIN
// When status moves to CONFIRMED+, trigger updateGoalProgress
// =============================================================
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/server/api-helpers'
import { requirePermission } from '@/server/permissions'
import { carbonTransactionSchema, carbonStatusSchema } from '@/server/validators/env'
import {
  getCarbonTransactionById,
  updateCarbonTransaction,
  updateCarbonStatus,
  deleteCarbonTransaction,
} from '@/server/services/env/carbon-transactions'
import { updateGoalProgress } from '@/server/services/env/goals'

export const PATCH = withAuth(async (req: NextRequest, ctx: any) => {
  requirePermission(ctx.session, 'carbon', 'update')
  const id = ctx.params.id as string
  const existing = await getCarbonTransactionById(id)
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()

  // Status-only transition (Confirm / Validate / etc.)
  if ('status' in body && Object.keys(body).length === 1) {
    const { status } = carbonStatusSchema.parse(body)
    const updated = await updateCarbonStatus(id, status)

    // Trigger goal progress sync when status reaches CONFIRMED+
    const confirmedStatuses = ['CONFIRMED', 'VALIDATED', 'POSTED']
    if (confirmedStatuses.includes(status) && existing.departmentId) {
      await updateGoalProgress(existing.departmentId)
    }

    return NextResponse.json(updated)
  }

  // Field update
  const data = carbonTransactionSchema.partial().parse(body)
  const updated = await updateCarbonTransaction(id, data)
  return NextResponse.json(updated)
})

export const DELETE = withAuth(async (_req: NextRequest, ctx: any) => {
  requirePermission(ctx.session, 'carbon', 'delete')
  const id = ctx.params.id as string
  const existing = await getCarbonTransactionById(id)
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await deleteCarbonTransaction(id)
  return NextResponse.json({ success: true })
})
