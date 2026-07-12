import { count, eq, sql } from 'drizzle-orm'
import { db } from '@/db'
import {
  carbonTransactions,
  employeeParticipations,
  complianceIssues,
  users,
} from '@/db/schema'
import { getScoreboard, type DeptScoreRow } from '@/server/services/score/read'
import { currentPeriod } from '@/lib/utils'

export interface DashboardSummary {
  period: string
  overall: { environmental: number; social: number; governance: number; total: number }
  departments: DeptScoreRow[]
  kpis: {
    totalCo2e: number
    esgScore: number
    participationRate: number
    issueClosureRate: number
    pendingApprovals: number
    openIssues: number
  }
}

export async function getDashboardSummary(
  period: string = currentPeriod(),
): Promise<DashboardSummary> {
  const scoreboard = await getScoreboard(period)

  const safe = async <T>(p: Promise<T>, fallback: T): Promise<T> => {
    try {
      return await p
    } catch {
      return fallback
    }
  }

  const [co2Row] = await safe(
    db.select({ v: sql<number>`coalesce(sum(${carbonTransactions.calculatedCo2}), 0)` }).from(
      carbonTransactions,
    ),
    [{ v: 0 }],
  )
  const [userRow] = await safe(db.select({ v: count() }).from(users), [{ v: 0 }])
  const approvedUsers = await safe(
    db
      .select({ userId: employeeParticipations.userId })
      .from(employeeParticipations)
      .where(eq(employeeParticipations.approvalStatus, 'APPROVED')),
    [] as { userId: string }[],
  )
  const [pendingRow] = await safe(
    db
      .select({ v: count() })
      .from(employeeParticipations)
      .where(eq(employeeParticipations.approvalStatus, 'PENDING')),
    [{ v: 0 }],
  )
  const issues = await safe(
    db.select({ status: complianceIssues.status }).from(complianceIssues),
    [] as { status: string }[],
  )

  const totalUsers = Number(userRow?.v ?? 0)
  const distinctApproved = new Set(approvedUsers.map((r) => r.userId)).size
  const participationRate =
    totalUsers > 0 ? Math.round((distinctApproved / totalUsers) * 100) : 0

  const totalIssues = issues.length
  const resolved = issues.filter((i) => i.status === 'RESOLVED').length
  const issueClosureRate =
    totalIssues > 0 ? Math.round((resolved / totalIssues) * 100) : 0
  const openIssues = totalIssues - resolved

  return {
    period,
    overall: scoreboard.overall,
    departments: scoreboard.departments,
    kpis: {
      totalCo2e: Math.round(Number(co2Row?.v ?? 0) * 10) / 10,
      esgScore: Math.round(scoreboard.overall.total),
      participationRate,
      issueClosureRate,
      pendingApprovals: Number(pendingRow?.v ?? 0),
      openIssues,
    },
  }
}
