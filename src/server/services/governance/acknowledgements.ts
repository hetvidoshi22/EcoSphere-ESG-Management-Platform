import { and, desc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { policyAcknowledgements, esgPolicies, users } from '@/db/schema'
import { conflict, notFound } from '@/server/errors'
import { recalculateScores } from '@/server/services/score/recalculate'

export interface AcknowledgementView {
  id: string
  userId: string
  userName: string | null
  policyId: string
  policyTitle: string | null
  acknowledgedAt: Date
}

export async function listAcknowledgements(): Promise<AcknowledgementView[]> {
  return (await db
    .select({
      id: policyAcknowledgements.id,
      userId: policyAcknowledgements.userId,
      userName: users.name,
      policyId: policyAcknowledgements.policyId,
      policyTitle: esgPolicies.title,
      acknowledgedAt: policyAcknowledgements.acknowledgedAt,
    })
    .from(policyAcknowledgements)
    .leftJoin(users, eq(policyAcknowledgements.userId, users.id))
    .leftJoin(esgPolicies, eq(policyAcknowledgements.policyId, esgPolicies.id))
    .orderBy(desc(policyAcknowledgements.acknowledgedAt))) as AcknowledgementView[]
}

/**
 * One-click, idempotent acknowledgement. A user can acknowledge a policy
 * once; a repeat returns a friendly 409 (also guarded by a DB unique index).
 */
export async function acknowledgePolicy(userId: string, policyId: string) {
  const [policy] = await db
    .select({ id: esgPolicies.id })
    .from(esgPolicies)
    .where(eq(esgPolicies.id, policyId))
    .limit(1)
  if (!policy) throw notFound('Policy not found')

  const [existing] = await db
    .select({ id: policyAcknowledgements.id })
    .from(policyAcknowledgements)
    .where(
      and(
        eq(policyAcknowledgements.userId, userId),
        eq(policyAcknowledgements.policyId, policyId),
      ),
    )
    .limit(1)
  if (existing) throw conflict('You have already acknowledged this policy')

  const [row] = await db
    .insert(policyAcknowledgements)
    .values({ userId, policyId })
    .returning()

  await recalculateScores() // ack-coverage feeds the Governance score
  return row
}
