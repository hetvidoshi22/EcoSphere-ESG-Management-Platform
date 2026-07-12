import { and, count, desc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { csrActivities, categories, employeeParticipations } from '@/db/schema'
import type { CsrActivityCreate, CsrActivityUpdate } from '@/server/validators/social'
import { notFound } from '@/server/errors'

export interface CsrActivityView {
  id: string
  title: string
  categoryId: string | null
  categoryName: string | null
  description: string | null
  date: Date | null
  evidenceRequired: boolean
  points: number
  status: string
  joinedCount: number
}

/** All CSR activities with their category label and a live joined-count. */
export async function listCsrActivities(): Promise<CsrActivityView[]> {
  const rows = await db
    .select({
      id: csrActivities.id,
      title: csrActivities.title,
      categoryId: csrActivities.categoryId,
      categoryName: categories.name,
      description: csrActivities.description,
      date: csrActivities.date,
      evidenceRequired: csrActivities.evidenceRequired,
      points: csrActivities.points,
      status: csrActivities.status,
    })
    .from(csrActivities)
    .leftJoin(categories, eq(csrActivities.categoryId, categories.id))
    .orderBy(desc(csrActivities.status), csrActivities.title)

  const counts = await db
    .select({ activityId: employeeParticipations.activityId, c: count() })
    .from(employeeParticipations)
    .groupBy(employeeParticipations.activityId)
  const countMap = new Map(counts.map((r) => [r.activityId, Number(r.c)]))

  return rows.map((r) => ({ ...r, joinedCount: countMap.get(r.id) ?? 0 }))
}

export async function getCsrActivity(id: string) {
  const [row] = await db.select().from(csrActivities).where(eq(csrActivities.id, id)).limit(1)
  if (!row) throw notFound('CSR activity not found')
  return row
}

export async function createCsrActivity(data: CsrActivityCreate) {
  const [row] = await db
    .insert(csrActivities)
    .values({
      title: data.title,
      categoryId: data.categoryId ?? null,
      description: data.description ?? null,
      date: data.date ?? null,
      evidenceRequired: data.evidenceRequired,
      points: data.points,
      status: data.status,
    })
    .returning()
  return row
}

export async function updateCsrActivity(id: string, data: CsrActivityUpdate) {
  await getCsrActivity(id)
  const [row] = await db
    .update(csrActivities)
    .set({
      ...(data.title !== undefined && { title: data.title }),
      ...(data.categoryId !== undefined && { categoryId: data.categoryId ?? null }),
      ...(data.description !== undefined && { description: data.description ?? null }),
      ...(data.date !== undefined && { date: data.date ?? null }),
      ...(data.evidenceRequired !== undefined && { evidenceRequired: data.evidenceRequired }),
      ...(data.points !== undefined && { points: data.points }),
      ...(data.status !== undefined && { status: data.status }),
    })
    .where(eq(csrActivities.id, id))
    .returning()
  return row
}

export async function deleteCsrActivity(id: string) {
  await getCsrActivity(id)
  // Remove dependent participations first to satisfy the FK.
  await db.delete(employeeParticipations).where(eq(employeeParticipations.activityId, id))
  await db.delete(csrActivities).where(eq(csrActivities.id, id))
  return { id }
}
