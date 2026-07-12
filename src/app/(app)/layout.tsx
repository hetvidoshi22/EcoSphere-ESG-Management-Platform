import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { count, eq } from 'drizzle-orm'
import { db } from '@/db'
import {
  carbonTransactions,
  challenges,
  complianceIssues,
  employeeParticipations,
} from '@/db/schema'
import { AppShell } from '@/components/app-shell/app-shell'
import type { NavCounts } from '@/components/app-shell/sidebar'

async function getNavCounts(): Promise<NavCounts> {
  const zero: NavCounts = { environmental: 0, social: 0, governance: 0, gamification: 0 }
  try {
    const [env, social, gov, gam] = await Promise.all([
      db.select({ v: count() }).from(carbonTransactions),
      db
        .select({ v: count() })
        .from(employeeParticipations)
        .where(eq(employeeParticipations.approvalStatus, 'PENDING')),
      db
        .select({ v: count() })
        .from(complianceIssues)
        .where(eq(complianceIssues.status, 'OPEN')),
      db.select({ v: count() }).from(challenges).where(eq(challenges.status, 'ACTIVE')),
    ])
    return {
      environmental: Number(env[0]?.v ?? 0),
      social: Number(social[0]?.v ?? 0),
      governance: Number(gov[0]?.v ?? 0),
      gamification: Number(gam[0]?.v ?? 0),
    }
  } catch {
    return zero
  }
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/sign-in')

  const counts = await getNavCounts()

  return (
    <AppShell session={session} counts={counts}>
      {children}
    </AppShell>
  )
}
