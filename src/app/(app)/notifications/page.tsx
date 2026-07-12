'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Toggle } from '../esg-config/page'

interface NotificationRow {
  id: string
  type: string
  title: string
  body: string | null
  read: boolean
  createdAt: string
}

interface NotifSettings {
  emailAlerts: boolean
  badgeAutoAward: boolean
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

async function getFeed(): Promise<{ notifications: NotificationRow[]; unread: number }> {
  const res = await fetch('/api/notifications')
  if (!res.ok) throw new Error('Failed to load notifications')
  return res.json()
}

async function getConfig(): Promise<NotifSettings> {
  const res = await fetch('/api/esg-config')
  if (!res.ok) throw new Error('Failed to load settings')
  const c = await res.json()
  return { emailAlerts: c.emailAlerts, badgeAutoAward: c.badgeAutoAward }
}

export default function NotificationsPage() {
  const { data: session } = useSession()
  const isAdmin = (session?.user as any)?.role === 'ADMIN'
  const qc = useQueryClient()

  const { data: feed } = useQuery({ queryKey: ['notifications'], queryFn: getFeed })
  const { data: settings } = useQuery({ queryKey: ['notif-settings'], queryFn: getConfig })
  const [form, setForm] = useState<NotifSettings | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (settings) setForm(settings)
  }, [settings])

  const save = useMutation({
    mutationFn: async (next: NotifSettings) => {
      const res = await fetch('/api/esg-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      })
      if (!res.ok) throw new Error('Save failed')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notif-settings'] })
      qc.invalidateQueries({ queryKey: ['esg-config'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    },
  })

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const items = feed?.notifications ?? []

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
      <p className="text-sm text-gray-600 mt-1 mb-8">Your alerts and delivery preferences.</p>

      {/* Notification settings (toggle subset of esg_config) */}
      <section className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Notification Settings</h2>
        {form ? (
          <>
            <div className="divide-y divide-gray-100">
              <Toggle
                label="Email alerts"
                description="Send notifications to your email"
                checked={form.emailAlerts}
                disabled={!isAdmin}
                onChange={(v) => setForm({ ...form, emailAlerts: v })}
              />
              <Toggle
                label="Badge auto-award notifications"
                description="Notify when a badge is auto-awarded"
                checked={form.badgeAutoAward}
                disabled={!isAdmin}
                onChange={(v) => setForm({ ...form, badgeAutoAward: v })}
              />
            </div>
            {isAdmin ? (
              <div className="flex items-center gap-3 mt-4">
                <button
                  onClick={() => save.mutate(form)}
                  disabled={save.isPending}
                  className="px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {save.isPending ? 'Saving…' : 'Save Settings'}
                </button>
                {saved && <span className="text-sm text-green-700">Saved ✓</span>}
              </div>
            ) : (
              <p className="text-xs text-gray-500 mt-3">Admin access required to change these.</p>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-500">Loading settings…</p>
        )}
      </section>

      {/* Notification feed */}
      <section className="bg-white p-6 rounded-lg border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Your Notifications</h2>
        {items.length === 0 ? (
          <p className="text-sm text-gray-500 py-4">No notifications yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {items.map((n) => (
              <li key={n.id} className={`py-3 ${n.read ? '' : 'bg-brand-primary/5 -mx-6 px-6'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{n.title}</p>
                    {n.body && <p className="text-xs text-gray-600 mt-0.5">{n.body}</p>}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-gray-400">{timeAgo(n.createdAt)}</span>
                    {!n.read && (
                      <button
                        onClick={() => markRead.mutate(n.id)}
                        className="text-xs text-brand-primary hover:underline"
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
