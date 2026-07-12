// =============================================================
// GovernanceScoreProvider (owner: Hetvi)
// Formula (PRD v2 §7):
//   Governance = ack-coverage × 50 + issue-closure × 50 − 5 per overdue-open issue
//   ack-coverage  = acknowledgements ÷ (applicable mandatory policies × headcount)
//   issue-closure = resolved issues ÷ total issues (for the department)
//   overdue-open  = issues past dueDate that are not RESOLVED
// A department with no policies AND no issues → 0 (no data), never throws.
// =============================================================
import { and, eq, inArray, isNull, or } from 'drizzle-orm'
import { db } from '@/db'
import { esgPolicies, policyAcknowledgements, complianceIssues, users } from '@/db/schema'
import type { ScoreProvider } from '@/server/scoring'

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)))
}

export async function getGovernanceScore(deptId: string): Promise<number> {
  try {
    // Employees in the department.
    const deptUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.departmentId, deptId))
    const deptUserIds = deptUsers.map((u) => u.id)
    const headcount = deptUserIds.length

    // Mandatory policies that apply to this department (dept-specific or company-wide).
    const applicable = await db
      .select({ id: esgPolicies.id })
      .from(esgPolicies)
      .where(
        and(
          eq(esgPolicies.mandatory, true),
          eq(esgPolicies.status, 'ACTIVE'),
          or(eq(esgPolicies.departmentId, deptId), isNull(esgPolicies.departmentId)),
        ),
      )
    const applicableIds = applicable.map((p) => p.id)

    // Issues owned by the department.
    const issues = await db
      .select({ status: complianceIssues.status, dueDate: complianceIssues.dueDate })
      .from(complianceIssues)
      .where(eq(complianceIssues.departmentId, deptId))

    // No governance data at all → 0.
    if (applicableIds.length === 0 && issues.length === 0) return 0

    // ----- ack coverage -----
    let ackCoverage = 1
    if (applicableIds.length > 0) {
      const expected = applicableIds.length * headcount
      if (expected === 0) {
        ackCoverage = 0
      } else {
        const acks =
          deptUserIds.length > 0
            ? await db
                .select({ id: policyAcknowledgements.id })
                .from(policyAcknowledgements)
                .where(
                  and(
                    inArray(policyAcknowledgements.userId, deptUserIds),
                    inArray(policyAcknowledgements.policyId, applicableIds),
                  ),
                )
            : []
        ackCoverage = Math.min(1, acks.length / expected)
      }
    }

    // ----- issue closure + overdue penalty -----
    const total = issues.length
    const resolved = issues.filter((i) => i.status === 'RESOLVED').length
    const issueClosure = total > 0 ? resolved / total : 1
    const now = Date.now()
    const overdueOpen = issues.filter(
      (i) => i.status !== 'RESOLVED' && i.dueDate && i.dueDate.getTime() < now,
    ).length

    return clamp(ackCoverage * 50 + issueClosure * 50 - 5 * overdueOpen)
  } catch {
    return 0
  }
}

export const governanceScoreProvider: ScoreProvider = {
  pillar: 'governance',
  name: 'GovernanceScoreProvider',
  getScore: (deptId) => getGovernanceScore(deptId),
}
