import { NextResponse } from 'next/server'
import type { Session } from 'next-auth'

/**
 * Domain HTTP errors thrown from services and caught by `withAuth`
 * (which returns any thrown Response as-is). NextResponse extends the
 * web Response, so `throw badRequest(...)` surfaces cleanly to the client.
 */
export function httpError(status: number, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status })
}

export const badRequest = (m = 'Bad request') => httpError(400, m)
export const forbidden = (m = 'Forbidden') => httpError(403, m)
export const notFound = (m = 'Not found') => httpError(404, m)
export const conflict = (m = 'Already exists') => httpError(409, m)
export const unprocessable = (m = 'Validation error') => httpError(422, m)

/** Typed view of the fields we stamp onto the JWT session in auth.ts. */
export interface SessionUser {
  id: string
  name?: string | null
  email?: string | null
  role: 'ADMIN' | 'ESG_MANAGER' | 'HR_MANAGER' | 'AUDITOR' | 'COMPLIANCE_OFFICER' | 'EMPLOYEE'
  departmentId: string | null
  totalXp: number
}

export function sessionUser(session: Session): SessionUser {
  const u = session.user as unknown as Partial<SessionUser>
  return {
    id: u.id as string,
    name: u.name,
    email: u.email,
    role: (u.role as SessionUser['role']) ?? 'EMPLOYEE',
    departmentId: u.departmentId ?? null,
    totalXp: u.totalXp ?? 0,
  }
}
