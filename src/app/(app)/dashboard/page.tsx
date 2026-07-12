'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { RefreshCw, Leaf, Trophy, FileBarChart } from 'lucide-react'
import { KpiTile } from '@/components/shared/kpi-tile'
import { ChartCard } from '@/components/shared/chart-card'
import type { DashboardSummary } from '@/server/services/dashboard/summary'

async function fetchSummary(): Promise<DashboardSummary> {
  const res = await fetch('/api/dashboard/summary')
  if (!res.ok) throw new Error('Failed to load dashboard')
  return res.json()
}

const ACTIVITY_META: Record<string, { icon: string; tag: string; color: string }> = {
  CARBON: { icon: '🌍', tag: 'Carbon', color: 'text-emerald-700 bg-emerald-50' },
  PARTICIPATION: { icon: '🤝', tag: 'CSR', color: 'text-blue-700 bg-blue-50' },
  COMPLIANCE: { icon: '⚠️', tag: 'Compliance', color: 'text-amber-700 bg-amber-50' },
  BADGE: { icon: '🏅', tag: 'Badge', color: 'text-purple-700 bg-purple-50' },
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

export default function Dashboard() {
  const { data: session } = useSession()
  const role = (session?.user as any)?.role
  const isAdmin = role === 'ADMIN'
  const qc = useQueryClient()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: fetchSummary,
  })

  const recalc = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/scores/recalculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!res.ok) throw new Error('Recalculate failed')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dashboard-summary'] }),
  })

  if (isLoading) {
    return <div className="text-gray-500">Loading dashboard…</div>
  }
  if (isError || !data) {
    return <div className="text-red-600">Could not load dashboard data.</div>
  }

  return (
    <div className="space-y-8">
      {/* Header + admin recalc */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-600 mt-1">
            Company ESG overview · period {data.period}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => recalc.mutate()}
            disabled={recalc.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-60 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${recalc.isPending ? 'animate-spin' : ''}`} />
            {recalc.isPending ? 'Recalculating…' : 'Recalculate Scores'}
          </button>
        )}
      </div>

      {/* SIX KPIs — company + personal in one row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiTile label="Total CO₂e (kg)" value={data.totalCo2e.toLocaleString()} />
        <KpiTile label="ESG Score" value={data.overall} />
        <KpiTile label="Compliance Alerts" value={data.complianceAlerts} />
        <KpiTile label="Your XP this month" value={data.me.xpThisMonth.toLocaleString()} />
        <KpiTile label="Your Dept Rank" value={data.me.deptRank ? `#${data.me.deptRank}` : '—'} />
        <KpiTile label="Participation" value={`${data.participationRate}%`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Emissions vs Target */}
        <div className="lg:col-span-2">
          <ChartCard title="Emissions vs Target (last 6 months)">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.emissionsVsTarget}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Legend />
                <Bar dataKey="emissions" name="Emissions" fill="#4F7A5A" radius={[4, 4, 0, 0]} />
                <Bar dataKey="target" name="Target" fill="#C8D6CC" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Department ESG Ranking */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Department ESG Ranking</h3>
          <ul className="space-y-3">
            {data.deptRanking.map((d) => (
              <li key={d.code} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold flex items-center justify-center">
                    {d.rank}
                  </span>
                  <span className="text-sm font-medium text-gray-900">{d.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900">{d.total}</span>
                  {d.delta !== 0 && (
                    <span className={`text-xs ${d.delta > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {d.delta > 0 ? '▲' : '▼'} {Math.abs(d.delta)}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <ul className="divide-y divide-gray-100">
            {data.recentActivity.map((a, i) => {
              const meta = ACTIVITY_META[a.type]
              return (
                <li key={i} className="flex items-center gap-3 py-3">
                  <span className="text-lg">{meta.icon}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${meta.color}`}>{meta.tag}</span>
                  <span className="text-sm text-gray-800 flex-1 truncate">{a.title}</span>
                  <span className="text-xs text-gray-400 whitespace-nowrap">{timeAgo(a.when)}</span>
                </li>
              )
            })}
            {data.recentActivity.length === 0 && (
              <li className="py-3 text-sm text-gray-500">No recent activity.</li>
            )}
          </ul>
        </div>

        {/* Active challenge + Badges + Quick actions */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Your Progress</h3>
            <p className="text-sm text-gray-600">
              Level {data.me.level} · {data.me.levelName} · {data.me.totalXp.toLocaleString()} XP
            </p>
            {data.me.activeChallenge ? (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-900">{data.me.activeChallenge.title}</p>
                <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-primary"
                    style={{ width: `${data.me.activeChallenge.progress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">{data.me.activeChallenge.progress}% complete</p>
              </div>
            ) : (
              <p className="mt-4 text-sm text-gray-500">No active challenge.</p>
            )}
            {data.me.badges.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {data.me.badges.map((b) => (
                  <span
                    key={b.name}
                    title={b.name}
                    className="text-xl"
                    aria-label={b.name}
                  >
                    {b.icon}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <QuickAction href="/carbon-transactions" icon={<Leaf className="w-4 h-4" />} label="Log Carbon Entry" />
              <QuickAction href="/challenges" icon={<Trophy className="w-4 h-4" />} label="Join a Challenge" />
              <QuickAction href="/reports/summary" icon={<FileBarChart className="w-4 h-4" />} label="View ESG Summary" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function QuickAction({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2 rounded-lg border border-gray-200 hover:border-brand-primary hover:bg-brand-primary/5 text-sm text-gray-800 transition-all"
    >
      <span className="text-brand-primary">{icon}</span>
      {label}
    </Link>
  )
}
