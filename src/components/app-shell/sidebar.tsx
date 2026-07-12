'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Session } from 'next-auth'
import {
  LayoutDashboard,
  Leaf,
  BarChart3,
  Users,
  FileText,
  CheckSquare,
  ShieldAlert,
  Trophy,
  LineChart,
  Settings,
  Gift,
  Medal,
  X,
} from 'lucide-react'
import { getLevel } from '@/lib/levels'

export interface NavCounts {
  environmental: number
  social: number
  governance: number
  gamification: number
}

const navGroups = [
  {
    title: 'Navigation',
    countKey: null as keyof NavCounts | null,
    items: [{ label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard }],
  },
  {
    title: 'Environmental',
    countKey: 'environmental' as const,
    items: [
      { label: 'Emission Factors', href: '/emission-factors', icon: Leaf },
      { label: 'Product ESG Profiles', href: '/product-profiles', icon: BarChart3 },
      { label: 'Carbon Transactions', href: '/carbon-transactions', icon: Leaf },
      { label: 'Environmental Goals', href: '/environmental-goals', icon: LineChart },
    ],
  },
  {
    title: 'Social',
    countKey: 'social' as const,
    items: [
      { label: 'CSR Activities', href: '/csr-activities', icon: Users },
      { label: 'Employee Participation', href: '/participation', icon: CheckSquare },
      { label: 'Diversity', href: '/diversity', icon: BarChart3 },
    ],
  },
  {
    title: 'Governance',
    countKey: 'governance' as const,
    items: [
      { label: 'Policies', href: '/policies', icon: FileText },
      { label: 'Acknowledgements', href: '/acknowledgements', icon: CheckSquare },
      { label: 'Audits', href: '/audits', icon: ShieldAlert },
      { label: 'Compliance Issues', href: '/compliance-issues', icon: ShieldAlert },
    ],
  },
  {
    title: 'Gamification',
    countKey: 'gamification' as const,
    items: [
      { label: 'Challenges', href: '/challenges', icon: Trophy },
      { label: 'Participation', href: '/challenge-participation', icon: Trophy },
      { label: 'Badges', href: '/badges', icon: Medal },
      { label: 'Rewards', href: '/rewards', icon: Gift },
      { label: 'Leaderboard', href: '/leaderboard', icon: LineChart },
    ],
  },
  {
    title: 'Reports',
    countKey: null,
    items: [
      { label: 'Environmental', href: '/reports/environmental', icon: LineChart },
      { label: 'Social', href: '/reports/social', icon: LineChart },
      { label: 'Governance', href: '/reports/governance', icon: LineChart },
      { label: 'ESG Summary', href: '/reports/summary', icon: LineChart },
    ],
  },
  {
    title: 'Settings',
    countKey: null,
    items: [
      { label: 'Departments', href: '/departments', icon: Settings },
      { label: 'Categories', href: '/categories', icon: Settings },
      { label: 'ESG Configuration', href: '/esg-config', icon: Settings },
      { label: 'Notifications', href: '/notifications', icon: Settings },
    ],
  },
]

function NavContent({
  counts,
  onNavigate,
  session,
}: {
  counts: NavCounts
  onNavigate?: () => void
  session: Session
}) {
  const pathname = usePathname()
  const user = session.user as { name?: string | null; totalXp?: number }
  const xp = user?.totalXp ?? 0
  const level = getLevel(xp)
  const initials =
    user?.name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'U'

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-6 py-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-primary text-sm font-bold text-white">
          E
        </span>
        <h1 className="text-xl font-bold text-brand-primary">EcoSphere</h1>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-6">
        {navGroups.map((group) => {
          const count = group.countKey ? counts[group.countKey] : undefined
          return (
            <div key={group.title}>
              <div className="mb-2 flex items-center justify-between px-3">
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-brand-muted">
                  {group.title}
                </h3>
                {count !== undefined && count > 0 && (
                  <span className="rounded-full bg-brand-surface px-2 py-0.5 text-[11px] font-semibold text-brand-primary-dark">
                    {count}
                  </span>
                )}
              </div>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon
                  const isActive =
                    pathname === item.href || pathname?.startsWith(item.href + '/')
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-brand-primary text-white shadow-sm'
                            : 'text-brand-text/80 hover:bg-brand-surface'
                        }`}
                      >
                        <Icon className="h-[18px] w-[18px] shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </nav>

      <div className="border-t border-black/5 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-primary text-xs font-semibold text-white">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-brand-text">
              {user?.name || 'User'}
            </div>
            <div className="truncate text-xs text-brand-muted">
              Level {level.level} · {level.name} · {xp.toLocaleString()} XP
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface SidebarProps {
  session: Session
  counts: NavCounts
  mobileOpen: boolean
  onClose: () => void
}

export function Sidebar({ session, counts, mobileOpen, onClose }: SidebarProps) {
  return (
    <>
      {/* Desktop: static column */}
      <aside className="hidden w-64 shrink-0 border-r border-black/5 bg-white lg:block">
        <NavContent counts={counts} session={session} />
      </aside>

      {/* Mobile/tablet: off-canvas drawer */}
      <div
        className={`fixed inset-0 z-50 lg:hidden ${mobileOpen ? '' : 'pointer-events-none'}`}
        aria-hidden={!mobileOpen}
      >
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity ${
            mobileOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={onClose}
        />
        <aside
          className={`absolute left-0 top-0 h-full w-72 max-w-[85vw] bg-white shadow-xl transition-transform duration-200 ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <button
            onClick={onClose}
            className="absolute right-3 top-4 z-10 rounded-md p-1.5 text-brand-muted hover:bg-brand-surface"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
          <NavContent counts={counts} session={session} onNavigate={onClose} />
        </aside>
      </div>
    </>
  )
}
