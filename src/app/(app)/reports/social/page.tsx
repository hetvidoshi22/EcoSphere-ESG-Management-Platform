'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
} from 'recharts'
import { PageHeader } from '@/components/shared/page-header'
import { KpiTile } from '@/components/shared/kpi-tile'
import { ChartCard } from '@/components/shared/chart-card'
import { DataTable, type Column } from '@/components/shared/data-table'
import { StatusPill } from '@/components/shared/status-pill'
import { ReportChrome, rangeStart, type TimeRange } from '@/components/shared/report-chrome'
import { apiGet } from '@/lib/api'
import { downloadCsv } from '@/lib/csv'
import { formatDate } from '@/lib/utils'
import type { Scoreboard } from '@/server/services/score/read'
import type { ParticipationView } from '@/server/services/social/participation'

export default function SocialReportPage() {
  const [range, setRange] = useState<TimeRange>('fy')

  const { data: board } = useQuery<Scoreboard>({
    queryKey: ['scoreboard'],
    queryFn: () => apiGet<Scoreboard>('/api/scoreboard'),
  })
  const { data: parts = [], isLoading } = useQuery<ParticipationView[]>({
    queryKey: ['participation'],
    queryFn: () => apiGet<ParticipationView[]>('/api/participation'),
  })

  const filtered = useMemo(() => {
    const start = rangeStart(range).getTime()
    return parts.filter((p) => new Date(p.createdAt).getTime() >= start)
  }, [parts, range])

  const approved = filtered.filter((p) => p.approvalStatus === 'APPROVED').length
  const pending = filtered.filter((p) => p.approvalStatus === 'PENDING').length
  const rejected = filtered.filter((p) => p.approvalStatus === 'REJECTED').length

  const chart =
    board?.departments.map((d) => ({ name: d.departmentName, score: Math.round(d.social) })) ??
    []

  const exportCsv = () =>
    downloadCsv(
      `social-report-${range}.csv`,
      filtered.map((p) => ({
        Employee: p.userName ?? '',
        Department: p.departmentName ?? '',
        Activity: p.activityTitle ?? '',
        Status: p.approvalStatus,
        Points: p.pointsEarned,
        Completed: p.completionDate ? formatDate(p.completionDate) : '',
      })),
    )

  const columns: Column<ParticipationView>[] = [
    { key: 'userName', label: 'Employee', render: (v) => (v as string) ?? '—' },
    { key: 'departmentName', label: 'Department', render: (v) => (v as string) ?? '—' },
    { key: 'activityTitle', label: 'Activity' },
    { key: 'pointsEarned', label: 'Points', render: (v) => `+${v as number}` },
    { key: 'approvalStatus', label: 'Status', render: (v) => <StatusPill status={v as string} /> },
  ]

  return (
    <div>
      <PageHeader title="Social Report" subtitle="CSR participation and Social pillar performance." />
      <ReportChrome range={range} onRange={setRange} onExport={exportCsv} />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiTile label="Avg Social Score" value={Math.round(board?.overall.social ?? 0)} />
        <KpiTile label="Approved" value={approved} />
        <KpiTile label="Pending" value={pending} />
        <KpiTile label="Rejected" value={rejected} />
      </div>

      <div className="mb-6">
        <ChartCard title="Social Score by Department">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chart} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#9ca3af" />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} stroke="#9ca3af" />
              <Tooltip cursor={{ fill: 'rgba(79,122,90,0.08)' }} />
              <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                {chart.map((_, i) => (
                  <Cell key={i} fill="#4f7a5a" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="rounded-xl border border-black/5 bg-white p-4">
        <DataTable columns={columns} data={filtered} loading={isLoading} />
      </div>
    </div>
  )
}
