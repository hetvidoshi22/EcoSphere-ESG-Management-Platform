'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Session } from 'next-auth'
import { signOut } from 'next-auth/react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, Search, LogOut, Menu, CheckCheck } from 'lucide-react'
import { getLevel } from '@/lib/levels'

interface TopbarProps {
  session: Session | null
  onMenuClick: () => void
}

interface NotificationRow {
  id: string
  type: string
  title: string
  body: string | null
  read: boolean
  createdAt: string
}

const NOTIF_ICON: Record<string, string> = {
  APPROVAL: '✅',
  BADGE: '🏅',
  COMPLIANCE: '⚠️',
  POLICY_REMINDER: '📄',
  REWARD: '🎁',
}

function breadcrumbFromPath(pathname: string | null): string {
  if (!pathname) return 'Dashboard'
  const parts = pathname.split('/').filter(Boolean)
  if (parts.length === 0) return 'Dashboard'
  const titleize = (s: string) =>
    s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  if (parts[0] === 'reports' && parts[1]) return `Reports · ${titleize(parts[1])}`
  return titleize(parts[parts.length - 1])
}

export function Topbar({ session, onMenuClick }: TopbarProps) {
  const [notifOpen, setNotifOpen] = useState(false)
  const pathname = usePathname()
  const queryClient = useQueryClient()

  const user = session?.user as { name?: string | null; totalXp?: number } | undefined
  const xp = user?.totalXp || 0
  const level = getLevel(xp).level

  const initials =
    user?.name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'U'

  const { data: notifications = [] } = useQuery<NotificationRow[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await fetch('/api/notifications')
      if (!res.ok) return []
      return res.json()
    },
    refetchInterval: 15000,
  })

  const unread = notifications.filter((n) => !n.read).length

  const markAllRead = async () => {
    await fetch('/api/notifications', { method: 'PATCH' })
    queryClient.invalidateQueries({ queryKey: ['notifications'] })
  }

  return (
    <header className="border-b border-black/5 bg-white">
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={onMenuClick}
            className="rounded-md p-1.5 text-brand-muted hover:bg-brand-surface lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex min-w-0 items-center gap-2 text-sm">
            <span className="hidden text-brand-muted sm:inline">EcoSphere</span>
            <span className="hidden text-brand-muted/50 sm:inline">›</span>
            <span className="truncate font-medium text-brand-text">
              {breadcrumbFromPath(pathname)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden items-center gap-2 rounded-lg bg-brand-surface px-3 py-2 xl:flex xl:w-64">
            <Search className="h-4 w-4 text-brand-muted" />
            <input
              type="text"
              placeholder="Search records, people…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-brand-muted"
            />
          </div>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setNotifOpen((o) => !o)}
              className="relative rounded-md p-2 text-brand-muted transition-colors hover:bg-brand-surface hover:text-brand-text"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unread > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {unread}
                </span>
              )}
            </button>

            {notifOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                <div className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-lg border border-black/5 bg-white shadow-xl">
                  <div className="flex items-center justify-between border-b border-black/5 px-4 py-3">
                    <h3 className="text-sm font-semibold text-brand-text">
                      Notifications {unread > 0 && `· ${unread} new`}
                    </h3>
                    {unread > 0 && (
                      <button
                        onClick={markAllRead}
                        className="flex items-center gap-1 text-xs font-medium text-brand-primary hover:underline"
                      >
                        <CheckCheck className="h-3.5 w-3.5" /> Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="px-4 py-8 text-center text-sm text-brand-muted">
                        No notifications yet
                      </p>
                    ) : (
                      notifications.slice(0, 10).map((n) => (
                        <div
                          key={n.id}
                          className={`flex gap-3 border-b border-black/5 px-4 py-3 last:border-0 ${
                            n.read ? '' : 'bg-brand-surface/50'
                          }`}
                        >
                          <span className="text-lg leading-none">
                            {NOTIF_ICON[n.type] || '🔔'}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-brand-text">{n.title}</p>
                            {n.body && (
                              <p className="mt-0.5 text-xs text-brand-muted">{n.body}</p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* User menu */}
          <div className="flex items-center gap-3 border-l border-black/5 pl-2 sm:pl-4">
            <div className="hidden text-right sm:block">
              <div className="text-sm font-medium text-brand-text">
                {user?.name || 'User'}
              </div>
              <div className="text-xs text-brand-muted">
                Level {level} · {xp.toLocaleString()} XP
              </div>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-primary text-xs font-semibold text-white">
              {initials}
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/sign-in' })}
              className="rounded-md p-2 text-brand-muted hover:bg-brand-surface hover:text-brand-text"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
