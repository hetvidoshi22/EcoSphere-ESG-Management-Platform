import { z } from 'zod'

/** '' → undefined so empty form fields don't fail optional validators. */
const emptyToUndef = (v: unknown) => (v === '' || v === null ? undefined : v)
const optDate = z.preprocess(emptyToUndef, z.coerce.date().optional())
const optString = z.preprocess(emptyToUndef, z.string().optional())

export const csrActivityCreateSchema = z.object({
  title: z.string().min(2, 'Title is required'),
  categoryId: optString,
  description: optString,
  date: optDate,
  evidenceRequired: z.boolean().default(true),
  points: z.coerce.number().int().min(0).max(10000).default(50),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
})

export const csrActivityUpdateSchema = csrActivityCreateSchema.partial()

export const participationJoinSchema = z.object({
  activityId: z.string().min(1, 'activityId is required'),
  proofUrl: z.preprocess(emptyToUndef, z.string().url('Must be a valid URL').optional()),
})

export const participationProofSchema = z.object({
  proofUrl: z.string().url('Must be a valid URL'),
})

export type CsrActivityCreate = z.infer<typeof csrActivityCreateSchema>
export type CsrActivityUpdate = z.infer<typeof csrActivityUpdateSchema>
