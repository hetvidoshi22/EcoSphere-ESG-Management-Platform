// =============================================================
// Environmental — Emission Factors service
// OWNER: Mitesh
// =============================================================
import { db } from '@/db'
import { emissionFactors } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import type { EmissionFactorInput } from '@/server/validators/env'

export async function listEmissionFactors() {
  return db
    .select()
    .from(emissionFactors)
    .orderBy(desc(emissionFactors.name))
}

export async function getEmissionFactorById(id: string) {
  const rows = await db
    .select()
    .from(emissionFactors)
    .where(eq(emissionFactors.id, id))
    .limit(1)
  return rows[0] ?? null
}

export async function createEmissionFactor(data: EmissionFactorInput) {
  const rows = await db
    .insert(emissionFactors)
    .values({
      name: data.name,
      category: data.category,
      unit: data.unit,
      co2PerUnit: data.co2PerUnit,
      source: data.source ?? null,
      country: data.country ?? null,
      effectiveDate: data.effectiveDate ? new Date(data.effectiveDate) : null,
      status: data.status,
    })
    .returning()
  return rows[0]
}

export async function updateEmissionFactor(id: string, data: Partial<EmissionFactorInput>) {
  const rows = await db
    .update(emissionFactors)
    .set({
      ...(data.name !== undefined && { name: data.name }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.unit !== undefined && { unit: data.unit }),
      ...(data.co2PerUnit !== undefined && { co2PerUnit: data.co2PerUnit }),
      ...(data.source !== undefined && { source: data.source ?? null }),
      ...(data.country !== undefined && { country: data.country ?? null }),
      ...(data.effectiveDate !== undefined && {
        effectiveDate: data.effectiveDate ? new Date(data.effectiveDate) : null,
      }),
      ...(data.status !== undefined && { status: data.status }),
    })
    .where(eq(emissionFactors.id, id))
    .returning()
  return rows[0] ?? null
}

export async function deleteEmissionFactor(id: string) {
  await db.delete(emissionFactors).where(eq(emissionFactors.id, id))
}
