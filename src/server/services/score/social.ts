// =============================================================
// SocialScoreProvider (owner: Hetvi)
// Formula (PRD v2 §7): Social = participation-rate × 70 + approval-quality × 30
//   participation-rate = distinct employees in the dept with an APPROVED
//                        CSR participation ÷ dept headcount   (capped at 1)
//   approval-quality   = approved ÷ (approved + rejected)     (decided only)
// Empty data → 0, never throws.
// =============================================================
import { count, eq } from 'drizzle-orm'
import { db } from '@/db'
import { employeeParticipations, users } from '@/db/schema'
import type { ScoreProvider } from '@/server/scoring'

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)))
}

export async function getSocialScore(deptId: string): Promise<number> {
  try {
    const [headRow] = await db
      .select({ c: count() })
      .from(users)
      .where(eq(users.departmentId, deptId))
    const headcount = Number(headRow?.c ?? 0)

    const parts = await db
      .select({
        status: employeeParticipations.approvalStatus,
        userId: employeeParticipations.userId,
      })
      .from(employeeParticipations)
      .innerJoin(users, eq(employeeParticipations.userId, users.id))
      .where(eq(users.departmentId, deptId))

    if (parts.length === 0) return 0

    const approved = parts.filter((p) => p.status === 'APPROVED')
    const rejected = parts.filter((p) => p.status === 'REJECTED')
    const distinctApproved = new Set(approved.map((p) => p.userId)).size

    const participationRate =
      headcount > 0 ? Math.min(1, distinctApproved / headcount) : 0
    const decided = approved.length + rejected.length
    const approvalQuality = decided > 0 ? approved.length / decided : 0

    return clamp(participationRate * 70 + approvalQuality * 30)
  } catch {
    return 0
  }
}

export const socialScoreProvider: ScoreProvider = {
  pillar: 'social',
  name: 'SocialScoreProvider',
  getScore: (deptId) => getSocialScore(deptId),
}
