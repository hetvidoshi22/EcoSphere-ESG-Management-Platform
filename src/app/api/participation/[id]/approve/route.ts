import { NextResponse } from 'next/server'
import { withAuth } from '@/server/api-helpers'
import { requirePermission } from '@/server/permissions'
import { approveParticipation } from '@/server/services/social/participation'

export const POST = withAuth(async (_req, ctx) => {
  requirePermission(ctx.session, 'participation', 'approve')
  const { id } = await ctx.params
  return NextResponse.json(await approveParticipation(id))
})
