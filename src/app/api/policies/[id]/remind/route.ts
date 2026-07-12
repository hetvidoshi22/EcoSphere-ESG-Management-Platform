import { NextResponse } from 'next/server'
import { withAuth } from '@/server/api-helpers'
import { requirePermission } from '@/server/permissions'
import { remindPolicyAcknowledgement } from '@/server/services/governance/policies'

// POST /api/policies/[id]/remind → notify + email every user who has not yet
// acknowledged this policy. Restricted to policy managers (ADMIN / COMPLIANCE_OFFICER).
export const POST = withAuth(async (_req, ctx?: any) => {
  requirePermission(ctx.session, 'policy', 'update')
  const { id } = await ctx.params
  const result = await remindPolicyAcknowledgement(id)
  return NextResponse.json(result)
})
