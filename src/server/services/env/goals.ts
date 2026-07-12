// =============================================================
// Environmental — Goals service
// OWNER: Mitesh
// updateGoalProgress: called whenever a carbon txn reaches CONFIRMED+
// =============================================================
import { db } from '@/db'
import { environmentalGoals, carbonTransactions, departments } from '@/db/schema'
import { eq, and, inArray, sql, desc } from 'drizzle-orm'
import type { GoalInput } from '@/server/validators/env'

export async function listGoals() {
  return db
    .select({
      id: environmentalGoals.id,
      name: environmentalGoals.name,
      departmentId: environmentalGoals.departmentId,
      departmentName: departments.name,
      targetCo2: environmentalGoals.targetCo2,
      currentCo2: environmentalGoals.currentCo2,
      deadline: environmentalGoals.deadline,
      status: environmentalGoals.status,
      createdAt: environmentalGoals.createdAt,
    })
    .from(environmentalGoals)
    .leftJoin(departments, eq(environmentalGoals.departmentId, departments.id))
    .orderBy(desc(environmentalGoals.createdAt))
}

export async function getGoalById(id: string) {
  const rows = await db
    .select({
      id: environmentalGoals.id,
      name: environmentalGoals.name,
      departmentId: environmentalGoals.departmentId,
      departmentName: departments.name,
      targetCo2: environmentalGoals.targetCo2,
      currentCo2: environmentalGoals.currentCo2,
      deadline: environmentalGoals.deadline,
      status: environmentalGoals.status,
      createdAt: environmentalGoals.createdAt,
    })
    .from(environmentalGoals)
    .leftJoin(departments, eq(environmentalGoals.departmentId, departments.id))
    .where(eq(environmentalGoals.id, id))
    .limit(1)
  return rows[0] ?? null
}

export async function createGoal(data: GoalInput) {
  const rows = await db
    .insert(environmentalGoals)
    .values({
      name: data.name,
      departmentId: data.departmentId,
      targetCo2: data.targetCo2,
      currentCo2: 0,
      deadline: data.deadline ? new Date(data.deadline) : null,
      status: data.status,
    })
    .returning()
  return rows[0]
}

export async function updateGoal(id: string, data: Partial<GoalInput>) {
  const rows = await db
    .update(environmentalGoals)
    .set({
      ...(data.name !== undefined && { name: data.name }),
      ...(data.departmentId !== undefined && { departmentId: data.departmentId }),
      ...(data.targetCo2 !== undefined && { targetCo2: data.targetCo2 }),
      ...(data.deadline !== undefined && { deadline: data.deadline ? new Date(data.deadline) : null }),
      ...(data.status !== undefined && { status: data.status }),
    })
    .where(eq(environmentalGoals.id, id))
    .returning()
  return rows[0] ?? null
}

export async function deleteGoal(id: string) {
  await db.delete(environmentalGoals).where(eq(environmentalGoals.id, id))
}

/**
 * Recompute currentCo2 for all ACTIVE goals of a department.
 * Called whenever a carbon transaction reaches CONFIRMED+ status.
 * currentCo2 = sum of calculatedCo2 for CONFIRMED|VALIDATED|POSTED txns for the dept.
 */
export async function updateGoalProgress(departmentId: string) {
  // Sum all confirmed+ transactions for this department (kg CO2e → tonnes)
  const result = await db
    .select({
      totalKg: sql<number>`COALESCE(SUM(${carbonTransactions.calculatedCo2}), 0)`,
    })
    .from(carbonTransactions)
    .where(
      and(
        eq(carbonTransactions.departmentId, departmentId),
        inArray(carbonTransactions.status, ['CONFIRMED', 'VALIDATED', 'POSTED']),
      ),
    )

  const totalKg = Number(result[0]?.totalKg ?? 0)
  const totalTonnes = totalKg / 1000

  // Update all ACTIVE goals for this department
  await db
    .update(environmentalGoals)
    .set({ currentCo2: totalTonnes })
    .where(
      and(
        eq(environmentalGoals.departmentId, departmentId),
        inArray(environmentalGoals.status, ['ACTIVE', 'ON_TRACK']),
      ),
    )
}
