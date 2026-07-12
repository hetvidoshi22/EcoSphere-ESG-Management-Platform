'use client'

import { useState } from 'react'
import type { Session } from 'next-auth'
import { Sidebar, type NavCounts } from './sidebar'
import { Topbar } from './topbar'

interface AppShellProps {
  session: Session
  counts: NavCounts
  children: React.ReactNode
}

/**
 * Responsive application shell.
 * - Desktop (lg+): static sidebar column + topbar + scrollable content.
 * - Mobile/tablet (<lg): sidebar becomes an off-canvas drawer toggled by the
 *   topbar hamburger; content is full-width.
 */
export function AppShell({ session, counts, children }: AppShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-brand-background">
      <Sidebar
        session={session}
        counts={counts}
        mobileOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar session={session} onMenuClick={() => setMobileNavOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  )
}
