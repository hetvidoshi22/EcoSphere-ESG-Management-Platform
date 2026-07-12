import { NextResponse } from 'next/server'
import { withAuth } from '@/server/api-helpers'
import { sessionUser, forbidden } from '@/server/errors'
import { recalculateScores } from '@/server/services/score/recalculate'
import { getScoreboard } from '@/server/services/score/read'

/** Manual "Recalculate" — Admin / ESG Manager only. */
export const POST = withAuth(async (_req, ctx) => {
  const { role } = sessionUser(ctx.session)
  if (role !== 'ADMIN' && role !== 'ESG_MANAGER') {
    return forbidden('Only an Admin or ESG Manager can recalculate scores')
  }
  await recalculateScores()
  return NextResponse.json(await getScoreboard())
})
