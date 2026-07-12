// =============================================================
// API: /api/carbon — GET list + KPIs, POST create
// OWNER: Mitesh
// Permissions: create = ADMIN | ESG_MANAGER | EMPLOYEE, read = all
// =============================================================
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/server/api-helpers'
import { requirePermission } from '@/server/permissions'
import { carbonTransactionSchema } from '@/server/validators/env'
import {
  listCarbonTransactions,
  createCarbonTransaction,
  getMonthlyKpis,
} from '@/server/services/env/carbon-transactions'

export const GET = withAuth(async (req: NextRequest, ctx: any) => {
  requirePermission(ctx.session, 'carbon', 'read')
  const { searchParams } = new URL(req.url)

  if (searchParams.get('kpis') === 'true') {
    const kpis = await getMonthlyKpis()
    return NextResponse.json(kpis)
  }

  const data = await listCarbonTransactions()
  return NextResponse.json(data)
})

export const POST = withAuth(async (req: NextRequest, ctx: any) => {
  requirePermission(ctx.session, 'carbon', 'create')
  const body = await req.json()
  const data = carbonTransactionSchema.parse(body)
  const createdById = (ctx.session.user as any).id as string
  const created = await createCarbonTransaction(data, createdById)
  return NextResponse.json(created, { status: 201 })
})
