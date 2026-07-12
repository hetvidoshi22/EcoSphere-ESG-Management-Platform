import { NextResponse } from 'next/server'
import { withAuth } from '@/server/api-helpers'
import { requirePermission } from '@/server/permissions'
import { resolveComplianceIssue } from '@/server/services/governance/compliance'

export const POST = withAuth(async (_req, ctx) => {
  requirePermission(ctx.session, 'complianceIssue', 'approve')
  const { id } = await ctx.params
  return NextResponse.json(await resolveComplianceIssue(id))
})
