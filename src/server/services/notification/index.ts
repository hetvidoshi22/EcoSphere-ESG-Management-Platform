// =============================================================
// EcoSphere — Notification service (owner: Shivam)
// notify() / notifyRole() insert notification rows. flagOverdue...
// runs the no-cron overdue compliance check (called from the dashboard
// summary route), notifying issue owners once per title+day.
// =============================================================
import { db } from '@/db'
import { notifications, complianceIssues, users } from '@/db/schema'
import { and, eq, lt, gte } from 'drizzle-orm'

type NotificationType = 'APPROVAL' | 'BADGE' | 'COMPLIANCE' | 'POLICY_REMINDER' | 'REWARD'
type Role = 'ADMIN' | 'ESG_MANAGER' | 'HR_MANAGER' | 'AUDITOR' | 'COMPLIANCE_OFFICER' | 'EMPLOYEE'

/** Insert a single notification row for a user. */
export async function notify(
  userId: string,
  type: NotificationType,
  title: string,
  body?: string,
) {
  await db.insert(notifications).values({ userId, type, title, body: body ?? null })
}

/** Notify every user holding a given role. */
export async function notifyRole(
  role: Role,
  type: NotificationType,
  title: string,
  body?: string,
) {
  const targets = await db.select({ id: users.id }).from(users).where(eq(users.role, role))
  if (targets.length === 0) return
  await db.insert(notifications).values(
    targets.map((u) => ({ userId: u.id, type, title, body: body ?? null })),
  )
}

/** Midnight (server clock) of the current day — dedupe boundary. */
function startOfToday(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

/**
 * No-cron overdue check: for every OPEN compliance issue past its dueDate,
 * notify its owner ONCE per title+day (dedupe by an already-existing
 * COMPLIANCE notification with the same title created today).
 * Returns the number of notifications created. Never throws on empty data.
 */
export async function flagOverdueComplianceIssues(): Promise<number> {
  const now = new Date()
  const overdue = await db
    .select({
      id: complianceIssues.id,
      description: complianceIssues.description,
      ownerId: complianceIssues.ownerId,
      dueDate: complianceIssues.dueDate,
    })
    .from(complianceIssues)
    .where(and(eq(complianceIssues.status, 'OPEN'), lt(complianceIssues.dueDate, now)))

  if (overdue.length === 0) return 0

  let created = 0
  const today = startOfToday()

  for (const issue of overdue) {
    const title = `Overdue compliance issue: ${issue.description}`.slice(0, 160)

    // Dedupe: skip if this owner already got this title today.
    const existing = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, issue.ownerId),
          eq(notifications.type, 'COMPLIANCE'),
          eq(notifications.title, title),
          gte(notifications.createdAt, today),
        ),
      )
      .limit(1)

    if (existing.length > 0) continue

    await db.insert(notifications).values({
      userId: issue.ownerId,
      type: 'COMPLIANCE',
      title,
      body: `This issue was due on ${issue.dueDate.toISOString().slice(0, 10)} and is still OPEN.`,
    })
    created++
  }

  return created
}
