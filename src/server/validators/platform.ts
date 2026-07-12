// =============================================================
// EcoSphere — Platform Zod validators (owner: Shivam)
// Used by scoring, departments, and esg-config API routes.
// =============================================================
import { z } from 'zod'

/** "2026-07" — YYYY-MM. */
export const periodSchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/, 'period must be YYYY-MM')

export const recalculateSchema = z.object({
  period: periodSchema.optional(),
})

// ---------- DEPARTMENTS ----------
const RECORD_STATUS = ['ACTIVE', 'INACTIVE'] as const

export const departmentCreateSchema = z.object({
  name: z.string().trim().min(1, 'name is required').max(120),
  code: z
    .string()
    .trim()
    .min(1, 'code is required')
    .max(12)
    .transform((s) => s.toUpperCase()),
  headId: z.string().min(1).nullable().optional(),
  parentId: z.string().min(1).nullable().optional(),
  status: z.enum(RECORD_STATUS).default('ACTIVE'),
})

// All fields optional for PATCH.
export const departmentUpdateSchema = departmentCreateSchema.partial()

// ---------- ESG CONFIG ----------
export const esgConfigUpdateSchema = z
  .object({
    weightEnvironmental: z.number().min(0).max(1),
    weightSocial: z.number().min(0).max(1),
    weightGovernance: z.number().min(0).max(1),
    autoEmissionCalc: z.boolean(),
    evidenceRequired: z.boolean(),
    badgeAutoAward: z.boolean(),
    emailAlerts: z.boolean(),
    xpEasy: z.number().int().min(0),
    xpMedium: z.number().int().min(0),
    xpHard: z.number().int().min(0),
    streakBonusEnabled: z.boolean(),
    deptMultiplierEnabled: z.boolean(),
    earlyBirdEnabled: z.boolean(),
  })
  .partial()
  .refine(
    (data) => {
      // Only enforce the sum rule when all three weights are present.
      const w = [data.weightEnvironmental, data.weightSocial, data.weightGovernance]
      if (w.some((x) => x === undefined)) return true
      const sum = (w as number[]).reduce((a, b) => a + b, 0)
      return Math.abs(sum - 1) <= 0.001
    },
    { message: 'weights must sum to 1.0 (±0.001)', path: ['weightEnvironmental'] },
  )
