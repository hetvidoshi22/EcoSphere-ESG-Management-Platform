import { z } from 'zod'

const emptyToUndef = (v: unknown) => (v === '' || v === null ? undefined : v)
const optDate = z.preprocess(emptyToUndef, z.coerce.date().optional())
const optString = z.preprocess(emptyToUndef, z.string().optional())

// ---------- Policies ----------
export const policyCreateSchema = z.object({
  title: z.string().min(2, 'Title is required'),
  type: optString,
  departmentId: optString,
  description: optString,
  version: z.preprocess(emptyToUndef, z.string().default('1.0')),
  effectiveDate: optDate,
  mandatory: z.boolean().default(true),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
})
export const policyUpdateSchema = policyCreateSchema.partial()

// ---------- Acknowledgements ----------
export const acknowledgeSchema = z.object({
  policyId: z.string().min(1, 'policyId is required'),
})

// ---------- Audits ----------
export const auditCreateSchema = z.object({
  title: z.string().min(2, 'Title is required'),
  departmentId: optString,
  auditorId: optString,
  date: optDate,
  findings: optString,
  status: z.enum(['OPEN', 'UNDER_REVIEW', 'RESOLVED']).default('OPEN'),
})
export const auditUpdateSchema = auditCreateSchema.partial()

// ---------- Compliance Issues ----------
// ownerId + dueDate are MANDATORY business rules — required here and NOT NULL in DB.
export const complianceCreateSchema = z.object({
  auditId: optString,
  description: z.string().min(3, 'Description is required'),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  departmentId: optString,
  ownerId: z.string().min(1, 'An owner is required'),
  dueDate: z.coerce.date({ message: 'A due date is required' }),
  status: z.enum(['OPEN', 'UNDER_REVIEW', 'RESOLVED']).default('OPEN'),
})
export const complianceUpdateSchema = complianceCreateSchema.partial()

export type PolicyCreate = z.infer<typeof policyCreateSchema>
export type AuditCreate = z.infer<typeof auditCreateSchema>
export type ComplianceCreate = z.infer<typeof complianceCreateSchema>
