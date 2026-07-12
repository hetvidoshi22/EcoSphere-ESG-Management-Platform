// =============================================================
// Environmental — Product ESG Profiles service
// OWNER: Mitesh
// =============================================================
import { db } from '@/db'
import { productEsgProfiles, emissionFactors } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import type { ProductProfileInput } from '@/server/validators/env'

export async function listProductProfiles() {
  return db
    .select({
      id: productEsgProfiles.id,
      product: productEsgProfiles.product,
      emissionFactorId: productEsgProfiles.emissionFactorId,
      emissionFactorName: emissionFactors.name,
      recyclable: productEsgProfiles.recyclable,
      hazardous: productEsgProfiles.hazardous,
      greenAlternative: productEsgProfiles.greenAlternative,
      carbonCategory: productEsgProfiles.carbonCategory,
    })
    .from(productEsgProfiles)
    .leftJoin(emissionFactors, eq(productEsgProfiles.emissionFactorId, emissionFactors.id))
    .orderBy(desc(productEsgProfiles.product))
}

export async function getProductProfileById(id: string) {
  const rows = await db
    .select({
      id: productEsgProfiles.id,
      product: productEsgProfiles.product,
      emissionFactorId: productEsgProfiles.emissionFactorId,
      emissionFactorName: emissionFactors.name,
      recyclable: productEsgProfiles.recyclable,
      hazardous: productEsgProfiles.hazardous,
      greenAlternative: productEsgProfiles.greenAlternative,
      carbonCategory: productEsgProfiles.carbonCategory,
    })
    .from(productEsgProfiles)
    .leftJoin(emissionFactors, eq(productEsgProfiles.emissionFactorId, emissionFactors.id))
    .where(eq(productEsgProfiles.id, id))
    .limit(1)
  return rows[0] ?? null
}

export async function createProductProfile(data: ProductProfileInput) {
  const rows = await db
    .insert(productEsgProfiles)
    .values({
      product: data.product,
      emissionFactorId: data.emissionFactorId ?? null,
      recyclable: data.recyclable ?? false,
      hazardous: data.hazardous ?? false,
      greenAlternative: data.greenAlternative ?? null,
      carbonCategory: data.carbonCategory ?? null,
    })
    .returning()
  return rows[0]
}

export async function updateProductProfile(id: string, data: Partial<ProductProfileInput>) {
  const rows = await db
    .update(productEsgProfiles)
    .set({
      ...(data.product !== undefined && { product: data.product }),
      ...(data.emissionFactorId !== undefined && { emissionFactorId: data.emissionFactorId ?? null }),
      ...(data.recyclable !== undefined && { recyclable: data.recyclable }),
      ...(data.hazardous !== undefined && { hazardous: data.hazardous }),
      ...(data.greenAlternative !== undefined && { greenAlternative: data.greenAlternative ?? null }),
      ...(data.carbonCategory !== undefined && { carbonCategory: data.carbonCategory ?? null }),
    })
    .where(eq(productEsgProfiles.id, id))
    .returning()
  return rows[0] ?? null
}

export async function deleteProductProfile(id: string) {
  await db.delete(productEsgProfiles).where(eq(productEsgProfiles.id, id))
}
