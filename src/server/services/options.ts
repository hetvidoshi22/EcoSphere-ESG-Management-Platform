import { desc } from 'drizzle-orm'
import { db } from '@/db'
import { departments, categories, users, audits } from '@/db/schema'

export interface FormOptions {
  departments: { id: string; name: string }[]
  categories: { id: string; name: string; type: string }[]
  users: { id: string; name: string; role: string; departmentId: string | null }[]
  audits: { id: string; title: string }[]
}

/** Reference data for drawer form dropdowns (departments, categories, users, audits). */
export async function getFormOptions(): Promise<FormOptions> {
  const [depts, cats, us, auds] = await Promise.all([
    db.select({ id: departments.id, name: departments.name }).from(departments),
    db
      .select({ id: categories.id, name: categories.name, type: categories.type })
      .from(categories),
    db
      .select({
        id: users.id,
        name: users.name,
        role: users.role,
        departmentId: users.departmentId,
      })
      .from(users),
    db.select({ id: audits.id, title: audits.title }).from(audits).orderBy(desc(audits.date)),
  ])
  return { departments: depts, categories: cats, users: us, audits: auds }
}
