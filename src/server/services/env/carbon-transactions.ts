// =============================================================
// Environmental — Carbon Transactions service
// OWNER: Mitesh
// Reference auto-generated: CT-XXXXX (count+1, zero-padded)
// calculatedCo2: quantity * factor.co2PerUnit (server-authoritative)
// =============================================================
import { db } from '@/db'
import { carbonTransactions, emissionFactors, departments } from '@/db/schema'
import { eq, and, gte, lte, count, desc, sql } from 'drizzle-orm'
import type { CarbonTransactionInput } from '@/server/validators/env'

export async function listCarbonTransactions() {
  return db
    .select({
      id: carbonTransactions.id,
      reference: carbonTransactions.reference,
      sourceModule: carbonTransactions.sourceModule,
      product: carbonTransactions.product,
      quantity: carbonTransactions.quantity,
      calculatedCo2: carbonTransactions.calculatedCo2,
      departmentId: carbonTransactions.departmentId,
      departmentName: departments.name,
      emissionFactorId: carbonTransactions.emissionFactorId,
      emissionFactorName: emissionFactors.name,
      emissionFactorUnit: emissionFactors.unit,
      date: carbonTransactions.date,
      status: carbonTransactions.status,
      createdById: carbonTransactions.createdById,
    })
    .from(carbonTransactions)
    .leftJoin(emissionFactors, eq(carbonTransactions.emissionFactorId, emissionFactors.id))
    .leftJoin(departments, eq(carbonTransactions.departmentId, departments.id))
    .orderBy(desc(carbonTransactions.date))
}

export async function getCarbonTransactionById(id: string) {
  const rows = await db
    .select({
      id: carbonTransactions.id,
      reference: carbonTransactions.reference,
      sourceModule: carbonTransactions.sourceModule,
      product: carbonTransactions.product,
      quantity: carbonTransactions.quantity,
      calculatedCo2: carbonTransactions.calculatedCo2,
      departmentId: carbonTransactions.departmentId,
      departmentName: departments.name,
      emissionFactorId: carbonTransactions.emissionFactorId,
      emissionFactorName: emissionFactors.name,
      emissionFactorUnit: emissionFactors.unit,
      date: carbonTransactions.date,
      status: carbonTransactions.status,
      createdById: carbonTransactions.createdById,
    })
    .from(carbonTransactions)
    .leftJoin(emissionFactors, eq(carbonTransactions.emissionFactorId, emissionFactors.id))
    .leftJoin(departments, eq(carbonTransactions.departmentId, departments.id))
    .where(eq(carbonTransactions.id, id))
    .limit(1)
  return rows[0] ?? null
}

async function generateReference(): Promise<string> {
  const result = await db.select({ count: count() }).from(carbonTransactions)
  const num = (result[0]?.count ?? 0) + 1
  return `CT-${String(num).padStart(5, '0')}`
}

export async function createCarbonTransaction(
  data: CarbonTransactionInput,
  createdById: string,
) {
  // Fetch factor for server-authoritative co2 calculation
  const factor = await db
    .select({ co2PerUnit: emissionFactors.co2PerUnit })
    .from(emissionFactors)
    .where(eq(emissionFactors.id, data.emissionFactorId))
    .limit(1)

  if (!factor[0]) throw new Error('Emission factor not found')

  const calculatedCo2 = data.quantity * factor[0].co2PerUnit
  const reference = await generateReference()

  const rows = await db
    .insert(carbonTransactions)
    .values({
      reference,
      sourceModule: data.sourceModule,
      product: data.product ?? null,
      quantity: data.quantity,
      emissionFactorId: data.emissionFactorId,
      calculatedCo2,
      departmentId: data.departmentId,
      date: new Date(data.date),
      status: 'DRAFT',
      createdById,
    })
    .returning()
  return rows[0]
}

export async function updateCarbonTransaction(
  id: string,
  data: Partial<CarbonTransactionInput>,
) {
  // If quantity or emissionFactorId changes, recompute co2
  let calculatedCo2: number | undefined

  if (data.quantity !== undefined || data.emissionFactorId !== undefined) {
    // Fetch existing to fill in missing pieces
    const existing = await db
      .select({
        quantity: carbonTransactions.quantity,
        emissionFactorId: carbonTransactions.emissionFactorId,
      })
      .from(carbonTransactions)
      .where(eq(carbonTransactions.id, id))
      .limit(1)

    if (existing[0]) {
      const qty = data.quantity ?? existing[0].quantity
      const factorId = data.emissionFactorId ?? existing[0].emissionFactorId
      const factor = await db
        .select({ co2PerUnit: emissionFactors.co2PerUnit })
        .from(emissionFactors)
        .where(eq(emissionFactors.id, factorId))
        .limit(1)
      if (factor[0]) {
        calculatedCo2 = qty * factor[0].co2PerUnit
      }
    }
  }

  const rows = await db
    .update(carbonTransactions)
    .set({
      ...(data.sourceModule !== undefined && { sourceModule: data.sourceModule }),
      ...(data.product !== undefined && { product: data.product ?? null }),
      ...(data.quantity !== undefined && { quantity: data.quantity }),
      ...(data.emissionFactorId !== undefined && { emissionFactorId: data.emissionFactorId }),
      ...(calculatedCo2 !== undefined && { calculatedCo2 }),
      ...(data.departmentId !== undefined && { departmentId: data.departmentId }),
      ...(data.date !== undefined && { date: new Date(data.date) }),
    })
    .where(eq(carbonTransactions.id, id))
    .returning()
  return rows[0] ?? null
}

export async function updateCarbonStatus(
  id: string,
  status: 'DRAFT' | 'CONFIRMED' | 'VALIDATED' | 'NEEDS_REVIEW' | 'POSTED',
) {
  const rows = await db
    .update(carbonTransactions)
    .set({ status })
    .where(eq(carbonTransactions.id, id))
    .returning()
  return rows[0] ?? null
}

export async function deleteCarbonTransaction(id: string) {
  await db.delete(carbonTransactions).where(eq(carbonTransactions.id, id))
}

// KPI helpers
export async function getMonthlyKpis() {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

  const rows = await db
    .select({
      totalCo2: sql<number>`COALESCE(SUM(${carbonTransactions.calculatedCo2}), 0)`,
      totalCount: count(),
      needsReviewCount: sql<number>`COUNT(*) FILTER (WHERE ${carbonTransactions.status} = 'NEEDS_REVIEW')`,
    })
    .from(carbonTransactions)
    .where(
      and(
        gte(carbonTransactions.date, startOfMonth),
        lte(carbonTransactions.date, endOfMonth),
      ),
    )

  return {
    totalCo2: Number(rows[0]?.totalCo2 ?? 0),
    totalCount: Number(rows[0]?.totalCount ?? 0),
    needsReviewCount: Number(rows[0]?.needsReviewCount ?? 0),
  }
}
