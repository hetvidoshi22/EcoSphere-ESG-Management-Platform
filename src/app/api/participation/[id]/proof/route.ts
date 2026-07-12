import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { employeeParticipations } from '@/db/schema'
import { withAuth } from '@/server/api-helpers'
import { sessionUser, forbidden, notFound } from '@/server/errors'
import { submitProof } from '@/server/services/social/participation'
import { participationProofSchema } from '@/server/validators/social'

/** An employee submits/updates proof for their own participation (or Admin/HR). */
export const POST = withAuth(async (req, ctx) => {
  const user = sessionUser(ctx.session)
  const { id } = await ctx.params
  const [row] = await db
    .select({ userId: employeeParticipations.userId })
    .from(employeeParticipations)
    .where(eq(employeeParticipations.id, id))
    .limit(1)
  if (!row) return notFound('Participation not found')

  const isOwner = row.userId === user.id
  const isManager = user.role === 'ADMIN' || user.role === 'HR_MANAGER'
  if (!isOwner && !isManager) return forbidden('You can only submit proof for your own participation')

  const body = participationProofSchema.parse(await req.json().catch(() => ({})))
  return NextResponse.json(await submitProof(id, body.proofUrl))
})
