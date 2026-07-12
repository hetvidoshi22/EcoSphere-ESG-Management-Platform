import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/server/api-helpers'
import { db } from '@/db'
import { users } from '@/db/schema'
import { asc } from 'drizzle-orm'

// GET /api/users → minimal list for select inputs (id, name, role, email).
// Any authenticated user; no sensitive fields returned.
export const GET = withAuth(async (_req: NextRequest, _ctx?: any) => {
  const rows = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role })
    .from(users)
    .orderBy(asc(users.name))

  return NextResponse.json({ users: rows })
})
