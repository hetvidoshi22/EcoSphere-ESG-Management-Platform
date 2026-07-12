import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/server/api-helpers'
import { getDashboardSummary } from '@/server/services/dashboard/summary'
import { flagOverdueComplianceIssues } from '@/server/services/notification'
import { DEFAULT_PERIOD } from '@/server/scoring'

// GET /api/dashboard/summary?period=YYYY-MM  (any authenticated user; read).
export const GET = withAuth(async (req: NextRequest, ctx?: any) => {
  const user = ctx.session.user
  const period = req.nextUrl.searchParams.get('period') || DEFAULT_PERIOD

  // No-cron overdue check: flag OPEN past-due issues and notify owners once.
  await flagOverdueComplianceIssues()

  const summary = await getDashboardSummary(user.id, user.departmentId ?? null, period)
  return NextResponse.json(summary)
})
