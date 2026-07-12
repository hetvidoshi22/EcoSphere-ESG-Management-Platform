// =============================================================
// EcoSphere — Dashboard summary aggregation (owner: Shivam)
// Pure read/query layer used by GET /api/dashboard/summary. Kept in a
// service so the route stays thin and the overdue-notification hook
// (STEP 4) can compose with it.
// =============================================================
import { db } from '@/db'
import {
  departments,
  departmentScores,
  carbonTransactions,
  employeeParticipations,
  csrActivities,
  complianceIssues,
  badgeAwards,
  badges,
  challenges,
  challengeParticipations,
  environmentalGoals,
  xpLedger,
  users,
} from '@/db/schema'
import { and, eq, gte, desc, sql, inArray } from 'drizzle-orm'
import { getLevel } from '@/lib/levels'
import { getOverall, DEFAULT_PERIOD, type ScorePeriod } from '@/server/scoring'

export interface RecentActivityItem {
  type: 'CARBON' | 'PARTICIPATION' | 'COMPLIANCE' | 'BADGE'
  title: string
  when: string // ISO
}

export interface DashboardSummary {
  period: string
  overall: number
  pillars: { env: number; social: number; gov: number }
  totalCo2e: number
  complianceAlerts: number
  participationRate: number // 0..100
  deptRanking: { name: string; code: string; total: number; rank: number; delta: number }[]
  recentActivity: RecentActivityItem[]
  emissionsVsTarget: { month: string; emissions: number; target: number }[]
  me: {
    totalXp: number
    level: number
    levelName: string
    xpThisMonth: number
    deptRank: number | null
    deptName: string | null
    activeChallenge: { title: string; progress: number } | null
    badges: { name: string; icon: string }[]
  }
}

/** First day of the current month (server clock), for xp-this-month sum. */
function startOfMonth(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

export async function getDashboardSummary(
  userId: string,
  userDepartmentId: string | null,
  period: ScorePeriod = DEFAULT_PERIOD,
): Promise<DashboardSummary> {
  // ---- Department scores (overall + pillars + ranking) ----
  const scoreRows = await db
    .select({
      departmentId: departmentScores.departmentId,
      name: departments.name,
      code: departments.code,
      environmental: departmentScores.environmental,
      social: departmentScores.social,
      governance: departmentScores.governance,
      total: departmentScores.total,
      rank: departmentScores.rank,
    })
    .from(departmentScores)
    .innerJoin(departments, eq(departmentScores.departmentId, departments.id))
    .where(eq(departmentScores.period, period))
    .orderBy(departmentScores.rank)

  const overall = await getOverall(period)
  const pillarAvg = (key: 'environmental' | 'social' | 'governance') =>
    scoreRows.length
      ? Math.round((scoreRows.reduce((a, r) => a + r[key], 0) / scoreRows.length) * 100) / 100
      : 0

  // Delta: this period's total vs the previous period's total for the dept.
  const prevPeriod = previousPeriod(period)
  const prevRows = await db
    .select({ departmentId: departmentScores.departmentId, total: departmentScores.total })
    .from(departmentScores)
    .where(eq(departmentScores.period, prevPeriod))
  const prevByDept = new Map(prevRows.map((r) => [r.departmentId, r.total]))

  const deptRanking = scoreRows.map((r) => ({
    name: r.name,
    code: r.code,
    total: r.total,
    rank: r.rank ?? 0,
    delta: prevByDept.has(r.departmentId)
      ? Math.round((r.total - (prevByDept.get(r.departmentId) as number)) * 100) / 100
      : 0,
  }))

  // ---- Total CO2e (all carbon transactions) ----
  const co2Row = await db
    .select({ sum: sql<number>`coalesce(sum(${carbonTransactions.calculatedCo2}), 0)` })
    .from(carbonTransactions)
  const totalCo2e = Math.round((co2Row[0]?.sum ?? 0) * 100) / 100

  // ---- Compliance alerts (OPEN issues) ----
  const alertRow = await db
    .select({ count: sql<number>`count(*)` })
    .from(complianceIssues)
    .where(eq(complianceIssues.status, 'OPEN'))
  const complianceAlerts = Number(alertRow[0]?.count ?? 0)

  // ---- Participation rate: approved participations / total employees ----
  const [{ approved }] = await db
    .select({ approved: sql<number>`count(*)` })
    .from(employeeParticipations)
    .where(eq(employeeParticipations.approvalStatus, 'APPROVED'))
  const [{ totalUsers }] = await db
    .select({ totalUsers: sql<number>`count(*)` })
    .from(users)
  const participationRate =
    Number(totalUsers) > 0
      ? Math.min(100, Math.round((Number(approved) / Number(totalUsers)) * 100))
      : 0

  // ---- Recent activity (latest 8 across 4 tables) ----
  const recentActivity = await getRecentActivity()

  // ---- Emissions vs target (last 6 months) ----
  const emissionsVsTarget = await getEmissionsVsTarget()

  // ---- Personal (me) ----
  const me = await getMe(userId, userDepartmentId, scoreRows)

  return {
    period,
    overall,
    pillars: { env: pillarAvg('environmental'), social: pillarAvg('social'), gov: pillarAvg('governance') },
    totalCo2e,
    complianceAlerts,
    participationRate,
    deptRanking,
    recentActivity,
    emissionsVsTarget,
    me,
  }
}

function previousPeriod(period: string): string {
  const [y, m] = period.split('-').map(Number)
  const d = new Date(y, m - 1, 1)
  d.setMonth(d.getMonth() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

async function getRecentActivity(): Promise<RecentActivityItem[]> {
  const [carbon, parts, issues, awards] = await Promise.all([
    db
      .select({ ref: carbonTransactions.reference, product: carbonTransactions.product, when: carbonTransactions.date })
      .from(carbonTransactions)
      .orderBy(desc(carbonTransactions.date))
      .limit(8),
    db
      .select({ title: csrActivities.title, status: employeeParticipations.approvalStatus, when: employeeParticipations.createdAt })
      .from(employeeParticipations)
      .innerJoin(csrActivities, eq(employeeParticipations.activityId, csrActivities.id))
      .orderBy(desc(employeeParticipations.createdAt))
      .limit(8),
    db
      .select({ description: complianceIssues.description, when: complianceIssues.createdAt })
      .from(complianceIssues)
      .orderBy(desc(complianceIssues.createdAt))
      .limit(8),
    db
      .select({ name: badges.name, when: badgeAwards.awardedAt })
      .from(badgeAwards)
      .innerJoin(badges, eq(badgeAwards.badgeId, badges.id))
      .orderBy(desc(badgeAwards.awardedAt))
      .limit(8),
  ])

  const items: RecentActivityItem[] = [
    ...carbon.map((c) => ({
      type: 'CARBON' as const,
      title: `Carbon entry ${c.ref}${c.product ? ` — ${c.product}` : ''}`,
      when: (c.when ?? new Date()).toISOString(),
    })),
    ...parts.map((p) => ({
      type: 'PARTICIPATION' as const,
      title: `${p.title} — ${p.status.toLowerCase()}`,
      when: (p.when ?? new Date()).toISOString(),
    })),
    ...issues.map((i) => ({
      type: 'COMPLIANCE' as const,
      title: i.description,
      when: (i.when ?? new Date()).toISOString(),
    })),
    ...awards.map((a) => ({
      type: 'BADGE' as const,
      title: `Badge earned — ${a.name}`,
      when: (a.when ?? new Date()).toISOString(),
    })),
  ]

  items.sort((a, b) => (a.when < b.when ? 1 : -1))
  return items.slice(0, 8)
}

async function getEmissionsVsTarget() {
  // Carbon totals grouped by YYYY-MM for the last 6 months, vs the sum of
  // active goal targets (flat line across months — goals aren't monthly).
  const rows = await db
    .select({
      month: sql<string>`to_char(${carbonTransactions.date}, 'YYYY-MM')`,
      emissions: sql<number>`coalesce(sum(${carbonTransactions.calculatedCo2}), 0)`,
    })
    .from(carbonTransactions)
    .groupBy(sql`to_char(${carbonTransactions.date}, 'YYYY-MM')`)

  const targetRow = await db
    .select({ target: sql<number>`coalesce(sum(${environmentalGoals.targetCo2}), 0)` })
    .from(environmentalGoals)
  const target = Math.round((targetRow[0]?.target ?? 0) * 100) / 100

  // Build the last 6 month buckets ending at the current month.
  const buckets: { month: string; emissions: number; target: number }[] = []
  const now = new Date()
  const byMonth = new Map(rows.map((r) => [r.month, Math.round(r.emissions * 100) / 100]))
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    buckets.push({ month: key, emissions: byMonth.get(key) ?? 0, target })
  }
  return buckets
}

async function getMe(
  userId: string,
  userDepartmentId: string | null,
  scoreRows: { departmentId: string; rank: number | null }[],
) {
  const userRow = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  const totalXp = userRow[0]?.totalXp ?? 0
  const lvl = getLevel(totalXp)

  const [{ xpThisMonth }] = await db
    .select({ xpThisMonth: sql<number>`coalesce(sum(${xpLedger.amount}), 0)` })
    .from(xpLedger)
    .where(and(eq(xpLedger.userId, userId), gte(xpLedger.createdAt, startOfMonth())))

  const deptScore = userDepartmentId
    ? scoreRows.find((r) => r.departmentId === userDepartmentId)
    : undefined
  const deptRank = deptScore?.rank ?? null
  const deptName = userDepartmentId
    ? (await db.select({ name: departments.name }).from(departments).where(eq(departments.id, userDepartmentId)).limit(1))[0]?.name ?? null
    : null

  // Active challenge the user is currently in (JOINED/PROOF_SUBMITTED).
  const activeCp = await db
    .select({ title: challenges.title, progress: challengeParticipations.progress })
    .from(challengeParticipations)
    .innerJoin(challenges, eq(challengeParticipations.challengeId, challenges.id))
    .where(
      and(
        eq(challengeParticipations.userId, userId),
        inArray(challengeParticipations.status, ['JOINED', 'PROOF_SUBMITTED']),
      ),
    )
    .limit(1)

  const myBadges = await db
    .select({ name: badges.name, icon: badges.icon })
    .from(badgeAwards)
    .innerJoin(badges, eq(badgeAwards.badgeId, badges.id))
    .where(eq(badgeAwards.userId, userId))
    .orderBy(desc(badgeAwards.awardedAt))

  return {
    totalXp,
    level: lvl.level,
    levelName: lvl.name,
    xpThisMonth: Number(xpThisMonth) || 0,
    deptRank,
    deptName,
    activeChallenge: activeCp[0] ? { title: activeCp[0].title, progress: activeCp[0].progress } : null,
    badges: myBadges,
  }
}
