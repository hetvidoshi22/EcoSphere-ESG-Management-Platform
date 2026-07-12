import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/server/api-helpers'
import { sessionUser, forbidden } from '@/server/errors'
import { db } from '@/db'
import { users } from '@/db/schema'
import { asc } from 'drizzle-orm'
import { createUser, userCreateSchema } from '@/server/services/users'

// GET /api/users → minimal list for select inputs (id, name, role, email).
// Any authenticated user; no sensitive fields returned.
export const GET = withAuth(async (_req: NextRequest, _ctx?: any) => {
  const rows = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role })
    .from(users)
    .orderBy(asc(users.name))

  return NextResponse.json({ users: rows })
})

// POST /api/users → ADMIN creates a new user account and triggers a welcome email.
export const POST = withAuth(async (req: NextRequest, ctx?: any) => {
  const actor = sessionUser(ctx.session)
  if (actor.role !== 'ADMIN') return forbidden('Only admins can create users')

  const body = userCreateSchema.parse(await req.json().catch(() => ({})))
  const created = await createUser(body)
  return NextResponse.json(created, { status: 201 })
})
