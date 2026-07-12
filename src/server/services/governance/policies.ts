import { count, desc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { esgPolicies, policyAcknowledgements, departments, users } from '@/db/schema'
import type { PolicyCreate } from '@/server/validators/governance'
import { notFound } from '@/server/errors'
import { notify } from '@/server/services/notification'
import { emailPolicyReminder } from '@/server/services/mail'

export interface PolicyView {
  id: string
  title: string
  type: string | null
  departmentId: string | null
  departmentName: string | null
  description: string | null
  version: string
  effectiveDate: Date | null
  mandatory: boolean
  status: string
  ackCount: number
  ackedByMe: boolean
}

export async function listPolicies(currentUserId?: string): Promise<PolicyView[]> {
  const rows = await db
    .select({
      id: esgPolicies.id,
      title: esgPolicies.title,
      type: esgPolicies.type,
      departmentId: esgPolicies.departmentId,
      departmentName: departments.name,
      description: esgPolicies.description,
      version: esgPolicies.version,
      effectiveDate: esgPolicies.effectiveDate,
      mandatory: esgPolicies.mandatory,
      status: esgPolicies.status,
    })
    .from(esgPolicies)
    .leftJoin(departments, eq(esgPolicies.departmentId, departments.id))
    .orderBy(desc(esgPolicies.mandatory), esgPolicies.title)

  const counts = await db
    .select({ policyId: policyAcknowledgements.policyId, c: count() })
    .from(policyAcknowledgements)
    .groupBy(policyAcknowledgements.policyId)
  const countMap = new Map(counts.map((r) => [r.policyId, Number(r.c)]))

  const mine = currentUserId
    ? await db
        .select({ policyId: policyAcknowledgements.policyId })
        .from(policyAcknowledgements)
        .where(eq(policyAcknowledgements.userId, currentUserId))
    : []
  const mineSet = new Set(mine.map((m) => m.policyId))

  return rows.map((r) => ({
    ...r,
    ackCount: countMap.get(r.id) ?? 0,
    ackedByMe: mineSet.has(r.id),
  }))
}

export async function getPolicy(id: string) {
  const [row] = await db.select().from(esgPolicies).where(eq(esgPolicies.id, id)).limit(1)
  if (!row) throw notFound('Policy not found')
  return row
}

export async function createPolicy(data: PolicyCreate) {
  const [row] = await db
    .insert(esgPolicies)
    .values({
      title: data.title,
      type: data.type ?? null,
      departmentId: data.departmentId ?? null,
      description: data.description ?? null,
      version: data.version ?? '1.0',
      effectiveDate: data.effectiveDate ?? null,
      mandatory: data.mandatory,
      status: data.status,
    })
    .returning()
  return row
}

export async function updatePolicy(id: string, data: Partial<PolicyCreate>) {
  await getPolicy(id)
  const [row] = await db
    .update(esgPolicies)
    .set({
      ...(data.title !== undefined && { title: data.title }),
      ...(data.type !== undefined && { type: data.type ?? null }),
      ...(data.departmentId !== undefined && { departmentId: data.departmentId ?? null }),
      ...(data.description !== undefined && { description: data.description ?? null }),
      ...(data.version !== undefined && { version: data.version }),
      ...(data.effectiveDate !== undefined && { effectiveDate: data.effectiveDate ?? null }),
      ...(data.mandatory !== undefined && { mandatory: data.mandatory }),
      ...(data.status !== undefined && { status: data.status }),
    })
    .where(eq(esgPolicies.id, id))
    .returning()
  return row
}

export async function deletePolicy(id: string) {
  await getPolicy(id)
  await db.delete(policyAcknowledgements).where(eq(policyAcknowledgements.policyId, id))
  await db.delete(esgPolicies).where(eq(esgPolicies.id, id))
  return { id }
}

/**
 * Send a policy-acknowledgement reminder (in-app notification + email) to
 * every user who has NOT yet acknowledged the given policy. Returns how many
 * users were reminded. Backs POST /api/policies/[id]/remind.
 */
export async function remindPolicyAcknowledgement(policyId: string) {
  const policy = await getPolicy(policyId) // throws notFound if missing

  const acked = await db
    .select({ userId: policyAcknowledgements.userId })
    .from(policyAcknowledgements)
    .where(eq(policyAcknowledgements.policyId, policyId))
  const ackedSet = new Set(acked.map((a) => a.userId))

  const allUsers = await db.select({ id: users.id }).from(users)
  const targets = allUsers.filter((u) => !ackedSet.has(u.id))

  for (const u of targets) {
    await notify(
      u.id,
      'POLICY_REMINDER',
      'Policy acknowledgement reminder',
      `Please review and acknowledge the policy: ${policy.title}`,
    )
    await emailPolicyReminder(u.id, policy.title)
  }

  return { policyId, reminded: targets.length }
}
