import { NextResponse } from 'next/server'
import { withAuth } from '@/server/api-helpers'
import { requirePermission } from '@/server/permissions'
import { sessionUser } from '@/server/errors'
import { listParticipations, joinActivity } from '@/server/services/social/participation'
import { participationJoinSchema } from '@/server/validators/social'

export const GET = withAuth(async (req, ctx) => {
  requirePermission(ctx.session, 'participation', 'read')
  const statusParam = new URL(req.url).searchParams.get('status')
  const status =
    statusParam === 'PENDING' || statusParam === 'APPROVED' || statusParam === 'REJECTED'
      ? statusParam
      : undefined
  return NextResponse.json(await listParticipations({ status }))
})

export const POST = withAuth(async (req, ctx) => {
  requirePermission(ctx.session, 'participation', 'create')
  const body = participationJoinSchema.parse(await req.json().catch(() => ({})))
  const user = sessionUser(ctx.session)
  const row = await joinActivity(user.id, body.activityId, body.proofUrl)
  return NextResponse.json(row, { status: 201 })
})
