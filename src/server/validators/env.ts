// =============================================================
// Environmental module — Zod validators
// OWNER: Mitesh
// =============================================================
import { z } from 'zod'

// ---------- Emission Factors ----------
export const emissionFactorSchema = z.object({
  name: z.string().min(1, 'Name is required').max(160),
  category: z.enum(['FUEL', 'ELECTRICITY', 'MATERIAL', 'TRANSPORT']),
  unit: z.string().min(1, 'Unit is required').max(24),
  co2PerUnit: z.number().positive('CO₂ per unit must be greater than 0'),
  source: z.string().max(160).optional(),
  country: z.string().max(80).optional(),
  effectiveDate: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
})

export type EmissionFactorInput = z.infer<typeof emissionFactorSchema>

// ---------- Product ESG Profiles ----------
export const productProfileSchema = z.object({
  product: z.string().min(1, 'Product name is required').max(160),
  emissionFactorId: z.string().min(1, 'Emission factor is required').optional().nullable(),
  recyclable: z.boolean().default(false),
  hazardous: z.boolean().default(false),
  greenAlternative: z.string().max(160).optional().nullable(),
  carbonCategory: z.enum(['FUEL', 'ELECTRICITY', 'MATERIAL', 'TRANSPORT']).optional().nullable(),
})

export type ProductProfileInput = z.infer<typeof productProfileSchema>

// ---------- Carbon Transactions ----------
export const carbonTransactionSchema = z.object({
  sourceModule: z
    .enum(['Manual', 'Fleet', 'Purchase', 'Expense', 'Manufacturing'])
    .default('Manual'),
  product: z.string().max(160).optional().nullable(),
  quantity: z.number().positive('Quantity must be greater than 0'),
  emissionFactorId: z.string().min(1, 'Emission factor is required'),
  departmentId: z.string().min(1, 'Department is required'),
  date: z.string().min(1, 'Date is required'),
})

export type CarbonTransactionInput = z.infer<typeof carbonTransactionSchema>

// Status transition payload
export const carbonStatusSchema = z.object({
  status: z.enum(['DRAFT', 'CONFIRMED', 'VALIDATED', 'NEEDS_REVIEW', 'POSTED']),
})

// ---------- Environmental Goals ----------
export const goalSchema = z.object({
  name: z.string().min(1, 'Name is required').max(160),
  departmentId: z.string().min(1, 'Department is required'),
  targetCo2: z.number().positive('Target CO₂ must be greater than 0'),
  deadline: z.string().optional().nullable(),
  status: z
    .enum(['DRAFT', 'ACTIVE', 'ON_TRACK', 'COMPLETED', 'EXPIRED'])
    .default('ACTIVE'),
})

export type GoalInput = z.infer<typeof goalSchema>

// ---------- Categories ----------
export const categorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  type: z.enum(['CSR_ACTIVITY', 'CHALLENGE']),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
})

export type CategoryInput = z.infer<typeof categorySchema>
