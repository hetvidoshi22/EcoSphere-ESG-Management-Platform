import { NextResponse } from 'next/server'
import { withAuth } from '@/server/api-helpers'
import { getScoreboard } from '@/server/services/score/read'

// Per-department pillar scores + company averages, for the Social /
// Governance / ESG-Summary reports (the dashboard summary only exposes
// totals, not the per-pillar-per-department breakdown these reports need).
export const GET = withAuth(async () => {
  return NextResponse.json(await getScoreboard())
})
