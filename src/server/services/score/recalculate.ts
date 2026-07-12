// =============================================================
// Score recalculation (Hetvi's Social + Governance vertical).
// Composes the two owned providers, weights per esg_config, and writes
// department_scores + ranks. Environmental is carried forward from the
// existing cached score (Mitesh's EnvironmentalScoreProvider owns it) so
// recomputing Social/Governance never zeroes the Environmental pillar.
// Empty data → 0, never crashes.
// =============================================================
import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { departments, departmentScores } from '@/db/schema'
import { getSocialScore } from './social'
import { getGovernanceScore } from './governance'
import { getEsgConfig } from '@/server/services/config'
import { currentPeriod } from '@/lib/utils'

export interface DeptScoreResult {
  departmentId: string
  environmental: number
  social: number
  governance: number
  total: number
  rank: number
}

export async function recalculateScores(
  period: string = currentPeriod(),
): Promise<DeptScoreResult[]> {
  const config = await getEsgConfig()
  const wEnv = config.weightEnvironmental
  const wSoc = config.weightSocial
  const wGov = config.weightGovernance

  const depts = await db.select().from(departments)

  const existing = await db
    .select()
    .from(departmentScores)
    .where(eq(departmentScores.period, period))
  const envCarry = new Map(existing.map((s) => [s.departmentId, s.environmental]))

  const computed = [] as Omit<DeptScoreResult, 'rank'>[]
  for (const d of depts) {
    const social = await getSocialScore(d.id)
    const governance = await getGovernanceScore(d.id)
    const environmental = envCarry.get(d.id) ?? 0
    const total =
      Math.round((environmental * wEnv + social * wSoc + governance * wGov) * 100) / 100
    computed.push({ departmentId: d.id, environmental, social, governance, total })
  }

  for (const c of computed) {
    await db
      .insert(departmentScores)
      .values({
        departmentId: c.departmentId,
        period,
        environmental: c.environmental,
        social: c.social,
        governance: c.governance,
        total: c.total,
        computedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [departmentScores.departmentId, departmentScores.period],
        set: {
          environmental: c.environmental,
          social: c.social,
          governance: c.governance,
          total: c.total,
          computedAt: new Date(),
        },
      })
  }

  // Rank by total desc and persist ranks.
  const ranked = [...computed].sort((a, b) => b.total - a.total)
  for (let i = 0; i < ranked.length; i++) {
    await db
      .update(departmentScores)
      .set({ rank: i + 1 })
      .where(
        and(
          eq(departmentScores.departmentId, ranked[i].departmentId),
          eq(departmentScores.period, period),
        ),
      )
  }

  return ranked.map((r, i) => ({ ...r, rank: i + 1 }))
}
