import { desc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { complianceIssues, audits, departments, users } from '@/db/schema'
import type { ComplianceCreate } from '@/server/validators/governance'
import { notFound } from '@/server/errors'
import { notify, notifyRoles } from '@/server/services/notification'
import { recalculateScores } from '@/server/services/score/recalculate'

export interface ComplianceIssueView {
  id: string
  auditId: string | null
  auditTitle: string | null
  description: string
  severity: string
  departmentId: string | null
  departmentName: string | null
  ownerId: string
  ownerName: string | null
  dueDate: Date
  status: string
  resolutionDate: Date | null
  overdue: boolean
  createdAt: Date
}

export async function listComplianceIssues(): Promise<ComplianceIssueView[]> {
  const rows = await db
    .select({
      id: complianceIssues.id,
      auditId: complianceIssues.auditId,
      auditTitle: audits.title,
      description: complianceIssues.description,
      severity: complianceIssues.severity,
      departmentId: complianceIssues.departmentId,
      departmentName: departments.name,
      ownerId: complianceIssues.ownerId,
      ownerName: users.name,
      dueDate: complianceIssues.dueDate,
      status: complianceIssues.status,
      resolutionDate: complianceIssues.resolutionDate,
      createdAt: complianceIssues.createdAt,
    })
    .from(complianceIssues)
    .leftJoin(audits, eq(complianceIssues.auditId, audits.id))
    .leftJoin(departments, eq(complianceIssues.departmentId, departments.id))
    .leftJoin(users, eq(complianceIssues.ownerId, users.id))
    .orderBy(desc(complianceIssues.createdAt))

  const now = Date.now()
  return rows.map((r) => ({
    ...r,
    overdue: r.status !== 'RESOLVED' && !!r.dueDate && r.dueDate.getTime() < now,
  }))
}

export async function getComplianceIssue(id: string) {
  const [row] = await db
    .select()
    .from(complianceIssues)
    .where(eq(complianceIssues.id, id))
    .limit(1)
  if (!row) throw notFound('Compliance issue not found')
  return row
}

/** Every issue must have an owner + due date (enforced by validator + DB NOT NULL). */
export async function createComplianceIssue(data: ComplianceCreate) {
  const [row] = await db
    .insert(complianceIssues)
    .values({
      auditId: data.auditId ?? null,
      description: data.description,
      severity: data.severity,
      departmentId: data.departmentId ?? null,
      ownerId: data.ownerId,
      dueDate: data.dueDate,
      status: data.status,
    })
    .returning()

  const overdue = row.dueDate.getTime() < Date.now()
  await notify(
    row.ownerId,
    'COMPLIANCE',
    'Compliance issue assigned to you',
    `${data.description}${overdue ? ' (already past due)' : ''}`,
  )
  await notifyRoles(['COMPLIANCE_OFFICER', 'ADMIN'], 'COMPLIANCE', 'New compliance issue raised', data.description)

  await recalculateScores() // a new open issue lowers issue-closure
  return row
}

export async function updateComplianceIssue(id: string, data: Partial<ComplianceCreate>) {
  await getComplianceIssue(id)
  const [row] = await db
    .update(complianceIssues)
    .set({
      ...(data.auditId !== undefined && { auditId: data.auditId ?? null }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.severity !== undefined && { severity: data.severity }),
      ...(data.departmentId !== undefined && { departmentId: data.departmentId ?? null }),
      ...(data.ownerId !== undefined && { ownerId: data.ownerId }),
      ...(data.dueDate !== undefined && { dueDate: data.dueDate }),
      ...(data.status !== undefined && { status: data.status }),
    })
    .where(eq(complianceIssues.id, id))
    .returning()
  await recalculateScores()
  return row
}

export async function resolveComplianceIssue(id: string) {
  const issue = await getComplianceIssue(id)
  if (issue.status === 'RESOLVED') return issue // idempotent
  const [row] = await db
    .update(complianceIssues)
    .set({ status: 'RESOLVED', resolutionDate: new Date() })
    .where(eq(complianceIssues.id, id))
    .returning()

  await notify(
    issue.ownerId,
    'COMPLIANCE',
    'Compliance issue resolved',
    issue.description,
  )
  await recalculateScores() // closure rate rises → Governance score moves
  return row
}

export async function deleteComplianceIssue(id: string) {
  await getComplianceIssue(id)
  await db.delete(complianceIssues).where(eq(complianceIssues.id, id))
  await recalculateScores()
  return { id }
}
