import { count, eq } from 'drizzle-orm'
import { db } from '@/db'
import { users, departments } from '@/db/schema'

export interface DiversityView {
  total: number
  byDepartment: { department: string; count: number }[]
  byRole: { role: string; count: number }[]
}

/** Read-only headcount/role breakdown for the Diversity dashboard. */
export async function getDiversity(): Promise<DiversityView> {
  const [byDept, byRole, totalRows] = await Promise.all([
    db
      .select({ department: departments.name, count: count(users.id) })
      .from(users)
      .leftJoin(departments, eq(users.departmentId, departments.id))
      .groupBy(departments.name),
    db.select({ role: users.role, count: count() }).from(users).groupBy(users.role),
    db.select({ c: count() }).from(users),
  ])

  return {
    total: Number(totalRows[0]?.c ?? 0),
    byDepartment: byDept.map((r) => ({
      department: r.department ?? 'Unassigned',
      count: Number(r.count),
    })),
    byRole: byRole.map((r) => ({ role: r.role, count: Number(r.count) })),
  }
}
