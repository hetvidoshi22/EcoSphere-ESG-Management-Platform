// =============================================================
// EcoSphere — Email notification helpers
// Thin, typed wrappers around sendEmail() + the HTML templates, one per
// business event. Each looks up the recipient's contact by userId (except
// welcome, which already has it) and NEVER throws, so a trigger call like
// `await emailCsrApproved(...)` can be dropped after a business action
// without any risk of breaking it.
// =============================================================
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { sendEmail } from './transport'
import * as tpl from './templates'

async function contact(userId: string): Promise<{ email: string; name: string } | null> {
  try {
    const [u] = await db
      .select({ email: users.email, name: users.name })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
    return u ?? null
  } catch (err) {
    console.error('[mail] could not load user contact', err)
    return null
  }
}

export async function emailWelcome(to: string, name: string) {
  try {
    const { subject, html } = tpl.welcomeTemplate(name)
    await sendEmail({ to, subject, html })
  } catch (err) {
    console.error('[mail] emailWelcome failed', err)
  }
}

export async function emailBadgeUnlocked(userId: string, badgeName: string, badgeIcon: string) {
  try {
    const u = await contact(userId)
    if (!u) return
    const { subject, html } = tpl.badgeUnlockedTemplate(u.name, badgeName, badgeIcon)
    await sendEmail({ to: u.email, subject, html })
  } catch (err) {
    console.error('[mail] emailBadgeUnlocked failed', err)
  }
}

export async function emailCsrApproved(userId: string, activityTitle: string, points: number) {
  try {
    const u = await contact(userId)
    if (!u) return
    const { subject, html } = tpl.csrApprovedTemplate(u.name, activityTitle, points)
    await sendEmail({ to: u.email, subject, html })
  } catch (err) {
    console.error('[mail] emailCsrApproved failed', err)
  }
}

export async function emailChallengeApproved(userId: string, challengeTitle: string, xp: number) {
  try {
    const u = await contact(userId)
    if (!u) return
    const { subject, html } = tpl.challengeApprovedTemplate(u.name, challengeTitle, xp)
    await sendEmail({ to: u.email, subject, html })
  } catch (err) {
    console.error('[mail] emailChallengeApproved failed', err)
  }
}

export async function emailPolicyReminder(userId: string, policyTitle: string) {
  try {
    const u = await contact(userId)
    if (!u) return
    const { subject, html } = tpl.policyReminderTemplate(u.name, policyTitle)
    await sendEmail({ to: u.email, subject, html })
  } catch (err) {
    console.error('[mail] emailPolicyReminder failed', err)
  }
}

export async function emailComplianceAssigned(
  userId: string,
  description: string,
  severity: string,
  dueDate: Date,
) {
  try {
    const u = await contact(userId)
    if (!u) return
    const { subject, html } = tpl.complianceAssignedTemplate(u.name, description, severity, dueDate)
    await sendEmail({ to: u.email, subject, html })
  } catch (err) {
    console.error('[mail] emailComplianceAssigned failed', err)
  }
}

export async function emailRewardRedeemed(userId: string, rewardName: string, pointsSpent: number) {
  try {
    const u = await contact(userId)
    if (!u) return
    const { subject, html } = tpl.rewardRedeemedTemplate(u.name, rewardName, pointsSpent)
    await sendEmail({ to: u.email, subject, html })
  } catch (err) {
    console.error('[mail] emailRewardRedeemed failed', err)
  }
}

// Re-export the generic sender for any ad-hoc use.
export { sendEmail } from './transport'
