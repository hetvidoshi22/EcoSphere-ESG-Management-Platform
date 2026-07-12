'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts'
import { RefreshCw, Trophy } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { KpiTile } from '@/components/shared/kpi-tile'
import { ChartCard } from '@/components/shared/chart-card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/shared/toast'
import { useCurrentUser } from '@/lib/hooks'
import { can } from '@/lib/roles'
import { apiGet, apiPost, ApiError } from '@/lib/api'
import type { DashboardSummary } from '@/server/services/dashboard'

const RANK_MEDAL = ['🥇', '🥈', '🥉']

export default function DashboardPage() {
  const { role, name } = useCurrentUser()
  const { toast } = useToast()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery<DashboardSummary>({
    queryKey: ['dashboard'],
    queryFn: () => apiGet<DashboardSummary>('/api/dashboard/summary'),
  })

  const recalc = useMutation({
    mutationFn: () => apiPost('/api/scores/recalculate'),
    onSuccess: () => {
      toast({ title: 'Scores recalculated', description: 'Department ranking refreshed.' })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['scoreboard'] })
    },
    onError: (e: ApiError) =>
      toast({ title: 'Recalculate blocked', description: e.message, variant: 'error' }),
  })

  const k = data?.kpis
  const chartData =
    data?.departments.map((d) => ({
      name: d.departmentName,
      Environmental: d.environmental,
      Social: d.social,
      Governance: d.governance,
    })) ?? []

  return (
    <div>
      <PageHeader
        title={`Welcome${name ? `, ${name.split(' ')[0]}` : ''}`}
        subtitle="Live ESG performance — scores derive from real employee action."
      >
        {can.recalculate(role) && (
          <Button
            variant="outline"
            onClick={() => recalc.mutate()}
            disabled={recalc.isPending}
          >
            <RefreshCw className={`mr-1 h-4 w-4 ${recalc.isPending ? 'animate-spin' : ''}`} />
            Recalculate
          </Button>
        )}
      </PageHeader>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-black/5" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
          <KpiTile label="Overall ESG" value={`${k?.esgScore ?? 0}/100`} />
          <KpiTile label="Total CO₂e" value={`${k?.totalCo2e ?? 0} kg`} />
          <KpiTile label="Participation" value={`${k?.participationRate ?? 0}%`} />
          <KpiTile label="Issue Closure" value={`${k?.issueClosureRate ?? 0}%`} />
          <KpiTile label="Pending Approvals" value={k?.pendingApprovals ?? 0} />
          <KpiTile label="Open Issues" value={k?.openIssues ?? 0} />
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <ChartCard title="ESG Pillars by Department">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <Tooltip cursor={{ fill: 'rgba(79,122,90,0.08)' }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Environmental" fill="#8fb89a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Social" fill="#4f7a5a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Governance" fill="#33503c" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <div className="lg:col-span-2">
          <div className="h-full rounded-lg border border-gray-200 bg-white p-6">
            <div className="mb-4 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-brand-primary" />
              <h3 className="text-lg font-semibold text-brand-text">Department ESG Ranking</h3>
            </div>
            <ul className="space-y-2">
              {(data?.departments ?? []).map((d, i) => (
                <li
                  key={d.departmentId}
                  className="flex items-center gap-3 rounded-lg border border-black/5 px-3 py-2"
                >
                  <span className="w-6 text-center text-sm font-bold text-brand-muted">
                    {RANK_MEDAL[i] ?? i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-brand-text">{d.departmentName}</div>
                    <div className="text-xs text-brand-muted">
                      E {Math.round(d.environmental)} · S {Math.round(d.social)} · G{' '}
                      {Math.round(d.governance)}
                    </div>
                  </div>
                  <span className="text-lg font-bold text-brand-primary">
                    {Math.round(d.total)}
                  </span>
                </li>
              ))}
              {(data?.departments ?? []).length === 0 && (
                <li className="py-6 text-center text-sm text-brand-muted">
                  No scores yet. Click Recalculate to compute.
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
