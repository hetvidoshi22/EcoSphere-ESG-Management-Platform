import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/server/api-helpers'
import { recalculateAll, getOverall, DEFAULT_PERIOD } from '@/server/scoring'
import { recalculateSchema } from '@/server/validators/platform'

// POST /api/scores/recalculate  { period? }  → runs the scoring engine.
// ADMIN | ESG_MANAGER only. There is no "score" entity in the permission
// matrix, so we gate on role explicitly (throwing a 403 Response, which
// withAuth passes through) rather than misusing an unrelated entity.
const SCORE_RECALC_ROLES = ['ADMIN', 'ESG_MANAGER']

export const POST = withAuth(async (req: NextRequest, ctx?: any) => {
  const role = ctx.session?.user?.role
  if (!SCORE_RECALC_ROLES.includes(role)) {
    throw new Response('Forbidden', { status: 403 })
  }

  const raw = await req.json().catch(() => ({}))
  const { period } = recalculateSchema.parse(raw)
  const effectivePeriod = period ?? DEFAULT_PERIOD

  const departments = await recalculateAll(effectivePeriod)
  const overall = await getOverall(effectivePeriod)

  return NextResponse.json({
    period: effectivePeriod,
    overall,
    departments: departments.map((d) => ({
      name: d.name,
      code: d.code,
      total: d.total,
      rank: d.rank,
      env: d.environmental,
      social: d.social,
      gov: d.governance,
    })),
  })
})
