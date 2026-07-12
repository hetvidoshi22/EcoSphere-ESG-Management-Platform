// =============================================================
// Environmental — Categories service
// OWNER: Mitesh
// =============================================================
import { db } from '@/db'
import { categories } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import type { CategoryInput } from '@/server/validators/env'

export async function listCategories() {
  return db.select().from(categories).orderBy(desc(categories.name))
}

export async function getCategoryById(id: string) {
  const rows = await db
    .select()
    .from(categories)
    .where(eq(categories.id, id))
    .limit(1)
  return rows[0] ?? null
}

export async function createCategory(data: CategoryInput) {
  const rows = await db
    .insert(categories)
    .values({
      name: data.name,
      type: data.type,
      status: data.status,
    })
    .returning()
  return rows[0]
}

export async function updateCategory(id: string, data: Partial<CategoryInput>) {
  const rows = await db
    .update(categories)
    .set({
      ...(data.name !== undefined && { name: data.name }),
      ...(data.type !== undefined && { type: data.type }),
      ...(data.status !== undefined && { status: data.status }),
    })
    .where(eq(categories.id, id))
    .returning()
  return rows[0] ?? null
}

export async function deleteCategory(id: string) {
  await db.delete(categories).where(eq(categories.id, id))
}
