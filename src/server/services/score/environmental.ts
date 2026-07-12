// =============================================================
// Environmental Score Provider
// OWNER: Mitesh
// Implements ScoreProvider from src/server/scoring.ts
//
// Algorithm:
//   If dept has ACTIVE goals:
//     budgetScore = max(0, 100 - max(0, (current - target) / target * 100))
//     averaged across all active goals
//   Else:
//     70 baseline - 5 per NEEDS_REVIEW carbon txn for dept in period (floor 0)
//   Result clamped 0..100
// =============================================================
import type { ScoreProvider, ScorePeriod } from '@/server/scoring'
import { db } from '@/db'
import { environmentalGoals, carbonTransactions } from '@/db/schema'
import { eq, and, inArray, count } from 'drizzle-orm'

export const environmentalScoreProvider: ScoreProvider = {
  pillar: 'environmental',
  name: 'Environmental Carbon Goals',

  async getScore(deptId: string, period: ScorePeriod): Promise<number> {
    // Fetch ACTIVE goals for the department
    const goals = await db
      .select({
        targetCo2: environmentalGoals.targetCo2,
        currentCo2: environmentalGoals.currentCo2,
      })
      .from(environmentalGoals)
      .where(
        and(
          eq(environmentalGoals.departmentId, deptId),
          inArray(environmentalGoals.status, ['ACTIVE', 'ON_TRACK']),
        ),
      )

    if (goals.length > 0) {
      // Budget score: lower emissions relative to target = higher score
      const scores = goals.map(({ targetCo2, currentCo2 }) => {
        if (targetCo2 <= 0) return 100
        const overBudgetPct = Math.max(0, ((currentCo2 - targetCo2) / targetCo2) * 100)
        return Math.max(0, 100 - overBudgetPct)
      })
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length
      return Math.min(100, Math.max(0, Math.round(avg * 100) / 100))
    }

    // Fallback: no goals — use 70 baseline minus 5 per NEEDS_REVIEW txn for dept in period
    // period format: "2026-07"
    const [year, month] = period.split('-').map(Number)
    const startOfPeriod = new Date(year, month - 1, 1)
    const endOfPeriod = new Date(year, month, 0, 23, 59, 59)

    const { gte, lte } = await import('drizzle-orm')
    const needsReview = await db
      .select({ cnt: count() })
      .from(carbonTransactions)
      .where(
        and(
          eq(carbonTransactions.departmentId, deptId),
          eq(carbonTransactions.status, 'NEEDS_REVIEW'),
          gte(carbonTransactions.date, startOfPeriod),
          lte(carbonTransactions.date, endOfPeriod),
        ),
      )

    const nrCount = Number(needsReview[0]?.cnt ?? 0)
    const score = Math.max(0, Math.min(100, 70 - nrCount * 5))
    return score
  },
}
