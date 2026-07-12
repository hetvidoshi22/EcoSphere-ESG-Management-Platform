// =============================================================
// NotificationService — writes in-app notification rows.
// Called by domain services on approval decisions, new compliance
// issues, overdue flags, and policy reminders. The topbar bell polls
// GET /api/notifications to surface these.
// =============================================================
import { inArray } from 'drizzle-orm'
import { db } from '@/db'
import { notifications, users } from '@/db/schema'

type NotificationType = 'APPROVAL' | 'BADGE' | 'COMPLIANCE' | 'POLICY_REMINDER' | 'REWARD'
type Role = 'ADMIN' | 'ESG_MANAGER' | 'HR_MANAGER' | 'AUDITOR' | 'COMPLIANCE_OFFICER' | 'EMPLOYEE'

export async function notify(
  userId: string,
  type: NotificationType,
  title: string,
  body?: string,
): Promise<void> {
  if (!userId) return
  await db.insert(notifications).values({ userId, type, title, body: body ?? null })
}

/** Fan a notification out to every user holding one of the given roles. */
export async function notifyRoles(
  roles: Role[],
  type: NotificationType,
  title: string,
  body?: string,
): Promise<void> {
  const recipients = await db
    .select({ id: users.id })
    .from(users)
    .where(inArray(users.role, roles))
  if (!recipients.length) return
  await db.insert(notifications).values(
    recipients.map((r) => ({ userId: r.id, type, title, body: body ?? null })),
  )
}

export const NotificationService = { notify, notifyRoles }
