import { NextResponse } from 'next/server'
import { withAuth } from '@/server/api-helpers'
import { requirePermission } from '@/server/permissions'
import { sessionUser } from '@/server/errors'
import {
  listAcknowledgements,
  acknowledgePolicy,
} from '@/server/services/governance/acknowledgements'
import { acknowledgeSchema } from '@/server/validators/governance'

export const GET = withAuth(async (_req, ctx) => {
  requirePermission(ctx.session, 'acknowledgement', 'read')
  return NextResponse.json(await listAcknowledgements())
})

export const POST = withAuth(async (req, ctx) => {
  requirePermission(ctx.session, 'acknowledgement', 'create')
  const { policyId } = acknowledgeSchema.parse(await req.json().catch(() => ({})))
  const user = sessionUser(ctx.session)
  const row = await acknowledgePolicy(user.id, policyId)
  return NextResponse.json(row, { status: 201 })
})
