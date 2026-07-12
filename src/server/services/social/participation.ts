import { and, desc, eq, sql } from 'drizzle-orm'
import { db } from '@/db'
import {
  employeeParticipations,
  csrActivities,
  users,
  departments,
  xpLedger,
} from '@/db/schema'
import { conflict, notFound, unprocessable } from '@/server/errors'
import { notify, notifyRoles } from '@/server/services/notification'
import { getEsgConfig } from '@/server/services/config'
import { recalculateScores } from '@/server/services/score/recalculate'

export interface ParticipationView {
  id: string
  userId: string
  userName: string | null
  departmentName: string | null
  activityId: string
  activityTitle: string | null
  activityPoints: number | null
  evidenceRequired: boolean | null
  proofUrl: string | null
  approvalStatus: string
  pointsEarned: number
  completionDate: Date | null
  createdAt: Date
}

const baseSelect = {
  id: employeeParticipations.id,
  userId: employeeParticipations.userId,
  userName: users.name,
  departmentName: departments.name,
  activityId: employeeParticipations.activityId,
  activityTitle: csrActivities.title,
  activityPoints: csrActivities.points,
  evidenceRequired: csrActivities.evidenceRequired,
  proofUrl: employeeParticipations.proofUrl,
  approvalStatus: employeeParticipations.approvalStatus,
  pointsEarned: employeeParticipations.pointsEarned,
  completionDate: employeeParticipations.completionDate,
  createdAt: employeeParticipations.createdAt,
}

export async function listParticipations(opts?: {
  status?: 'PENDING' | 'APPROVED' | 'REJECTED'
}): Promise<ParticipationView[]> {
  const q = db
    .select(baseSelect)
    .from(employeeParticipations)
    .leftJoin(users, eq(employeeParticipations.userId, users.id))
    .leftJoin(departments, eq(users.departmentId, departments.id))
    .leftJoin(csrActivities, eq(employeeParticipations.activityId, csrActivities.id))
    .orderBy(desc(employeeParticipations.createdAt))

  const rows = opts?.status
    ? await q.where(eq(employeeParticipations.approvalStatus, opts.status))
    : await q
  return rows as ParticipationView[]
}

/** Idempotent join: a user can only join a given activity once. */
export async function joinActivity(userId: string, activityId: string, proofUrl?: string) {
  const [activity] = await db
    .select()
    .from(csrActivities)
    .where(eq(csrActivities.id, activityId))
    .limit(1)
  if (!activity) throw notFound('CSR activity not found')

  const [existing] = await db
    .select({ id: employeeParticipations.id })
    .from(employeeParticipations)
    .where(
      and(
        eq(employeeParticipations.userId, userId),
        eq(employeeParticipations.activityId, activityId),
      ),
    )
    .limit(1)
  if (existing) throw conflict('You have already joined this activity')

  const [row] = await db
    .insert(employeeParticipations)
    .values({ userId, activityId, proofUrl: proofUrl ?? null, approvalStatus: 'PENDING' })
    .returning()

  await notifyRoles(
    ['HR_MANAGER', 'ADMIN'],
    'APPROVAL',
    'New participation pending',
    `A submission for "${activity.title}" is awaiting approval.`,
  )
  return row
}

export async function submitProof(participationId: string, proofUrl: string) {
  const [existing] = await db
    .select()
    .from(employeeParticipations)
    .where(eq(employeeParticipations.id, participationId))
    .limit(1)
  if (!existing) throw notFound('Participation not found')
  const [row] = await db
    .update(employeeParticipations)
    .set({ proofUrl })
    .where(eq(employeeParticipations.id, participationId))
    .returning()
  return row
}

async function loadWithActivity(participationId: string) {
  const [row] = await db
    .select({
      p: employeeParticipations,
      activityTitle: csrActivities.title,
      activityPoints: csrActivities.points,
      activityEvidence: csrActivities.evidenceRequired,
    })
    .from(employeeParticipations)
    .leftJoin(csrActivities, eq(employeeParticipations.activityId, csrActivities.id))
    .where(eq(employeeParticipations.id, participationId))
    .limit(1)
  if (!row) throw notFound('Participation not found')
  return row
}

/**
 * Approve a CSR participation.
 * Enforces the evidence gate, awards points as XP, notifies the employee,
 * leaves the badge hook seam for Shreya, and recomputes scores so the
 * Social score visibly moves.
 */
export async function approveParticipation(participationId: string) {
  const { p, activityTitle, activityPoints, activityEvidence } =
    await loadWithActivity(participationId)
  if (p.approvalStatus === 'APPROVED') return p // idempotent

  const config = await getEsgConfig()
  const gateOn = config.evidenceRequired && activityEvidence
  if (gateOn && !p.proofUrl) {
    throw unprocessable('A proof file is required before this participation can be approved')
  }

  const points = activityPoints ?? 0
  const [updated] = await db
    .update(employeeParticipations)
    .set({ approvalStatus: 'APPROVED', pointsEarned: points, completionDate: new Date() })
    .where(eq(employeeParticipations.id, participationId))
    .returning()

  // Credit points as XP (source-attributed, append-only ledger + running total).
  if (points > 0) {
    await db.insert(xpLedger).values({
      userId: p.userId,
      amount: points,
      source: `csr:${p.activityId}`,
    })
    await db
      .update(users)
      .set({ totalXp: sql`${users.totalXp} + ${points}` })
      .where(eq(users.id, p.userId))
  }

  // TODO(shreya): badge hook — when config.badgeAutoAward is on, call
  // BadgeService.evaluate(p.userId) here to auto-unlock XP-threshold badges.

  await notify(
    p.userId,
    'APPROVAL',
    'CSR participation approved',
    `You earned ${points} points for "${activityTitle}".`,
  )

  await recalculateScores()
  return updated
}

export async function rejectParticipation(participationId: string) {
  const { p, activityTitle } = await loadWithActivity(participationId)
  if (p.approvalStatus === 'REJECTED') return p // idempotent

  // If it was previously approved, reverse the awarded XP to keep the ledger honest.
  if (p.approvalStatus === 'APPROVED' && p.pointsEarned > 0) {
    await db.insert(xpLedger).values({
      userId: p.userId,
      amount: -p.pointsEarned,
      source: `csr-reversal:${p.activityId}`,
    })
    await db
      .update(users)
      .set({ totalXp: sql`${users.totalXp} - ${p.pointsEarned}` })
      .where(eq(users.id, p.userId))
  }

  const [updated] = await db
    .update(employeeParticipations)
    .set({ approvalStatus: 'REJECTED', pointsEarned: 0, completionDate: null })
    .where(eq(employeeParticipations.id, participationId))
    .returning()

  await notify(
    p.userId,
    'APPROVAL',
    'CSR participation rejected',
    `Your submission for "${activityTitle}" was not approved.`,
  )

  await recalculateScores()
  return updated
}
