import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { departmentScores, departments } from '@/db/schema'
import { currentPeriod } from '@/lib/utils'

export interface DeptScoreRow {
  departmentId: string
  departmentName: string
  environmental: number
  social: number
  governance: number
  total: number
  rank: number | null
}

export interface Scoreboard {
  period: string
  departments: DeptScoreRow[]
  overall: { environmental: number; social: number; governance: number; total: number }
}

const round = (n: number) => Math.round(n * 100) / 100

/** Read cached department_scores for a period + the company-level averages. */
export async function getScoreboard(period: string = currentPeriod()): Promise<Scoreboard> {
  const rows = await db
    .select({
      departmentId: departmentScores.departmentId,
      departmentName: departments.name,
      environmental: departmentScores.environmental,
      social: departmentScores.social,
      governance: departmentScores.governance,
      total: departmentScores.total,
      rank: departmentScores.rank,
    })
    .from(departmentScores)
    .leftJoin(departments, eq(departmentScores.departmentId, departments.id))
    .where(eq(departmentScores.period, period))

  const list: DeptScoreRow[] = rows
    .map((r) => ({ ...r, departmentName: r.departmentName ?? 'Unknown' }))
    .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))

  const n = list.length || 1
  const overall = {
    environmental: round(list.reduce((s, r) => s + r.environmental, 0) / n),
    social: round(list.reduce((s, r) => s + r.social, 0) / n),
    governance: round(list.reduce((s, r) => s + r.governance, 0) / n),
    total: round(list.reduce((s, r) => s + r.total, 0) / n),
  }

  return { period, departments: list, overall }
}
