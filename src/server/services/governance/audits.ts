import { count, desc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { audits, departments, users, complianceIssues } from '@/db/schema'
import type { AuditCreate } from '@/server/validators/governance'
import { notFound } from '@/server/errors'

export interface AuditView {
  id: string
  title: string
  departmentId: string | null
  departmentName: string | null
  auditorId: string | null
  auditorName: string | null
  date: Date | null
  findings: string | null
  status: string
  issueCount: number
}

export async function listAudits(): Promise<AuditView[]> {
  const rows = await db
    .select({
      id: audits.id,
      title: audits.title,
      departmentId: audits.departmentId,
      departmentName: departments.name,
      auditorId: audits.auditorId,
      auditorName: users.name,
      date: audits.date,
      findings: audits.findings,
      status: audits.status,
    })
    .from(audits)
    .leftJoin(departments, eq(audits.departmentId, departments.id))
    .leftJoin(users, eq(audits.auditorId, users.id))
    .orderBy(desc(audits.date))

  const counts = await db
    .select({ auditId: complianceIssues.auditId, c: count() })
    .from(complianceIssues)
    .groupBy(complianceIssues.auditId)
  const countMap = new Map(counts.map((r) => [r.auditId, Number(r.c)]))

  return rows.map((r) => ({ ...r, issueCount: countMap.get(r.id) ?? 0 }))
}

export async function getAudit(id: string) {
  const [row] = await db.select().from(audits).where(eq(audits.id, id)).limit(1)
  if (!row) throw notFound('Audit not found')
  return row
}

export async function createAudit(data: AuditCreate) {
  const [row] = await db
    .insert(audits)
    .values({
      title: data.title,
      departmentId: data.departmentId ?? null,
      auditorId: data.auditorId ?? null,
      date: data.date ?? null,
      findings: data.findings ?? null,
      status: data.status,
    })
    .returning()
  return row
}

export async function updateAudit(id: string, data: Partial<AuditCreate>) {
  await getAudit(id)
  const [row] = await db
    .update(audits)
    .set({
      ...(data.title !== undefined && { title: data.title }),
      ...(data.departmentId !== undefined && { departmentId: data.departmentId ?? null }),
      ...(data.auditorId !== undefined && { auditorId: data.auditorId ?? null }),
      ...(data.date !== undefined && { date: data.date ?? null }),
      ...(data.findings !== undefined && { findings: data.findings ?? null }),
      ...(data.status !== undefined && { status: data.status }),
    })
    .where(eq(audits.id, id))
    .returning()
  return row
}

export async function deleteAudit(id: string) {
  await getAudit(id)
  // Detach issues (auditId is nullable) rather than delete governance history.
  await db
    .update(complianceIssues)
    .set({ auditId: null })
    .where(eq(complianceIssues.auditId, id))
  await db.delete(audits).where(eq(audits.id, id))
  return { id }
}
