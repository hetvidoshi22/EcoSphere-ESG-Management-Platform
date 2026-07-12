'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
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
import { PageHeader } from '@/components/shared/page-header'
import { KpiTile } from '@/components/shared/kpi-tile'
import { ChartCard } from '@/components/shared/chart-card'
import { DataTable, type Column } from '@/components/shared/data-table'
import { ReportChrome, type TimeRange } from '@/components/shared/report-chrome'
import { apiGet } from '@/lib/api'
import { downloadCsv } from '@/lib/csv'
import type { Scoreboard, DeptScoreRow } from '@/server/services/score/read'

export default function EsgSummaryReportPage() {
  const [range, setRange] = useState<TimeRange>('month')

  const { data, isLoading } = useQuery<Scoreboard>({
    queryKey: ['scoreboard'],
    queryFn: () => apiGet<Scoreboard>('/api/scoreboard'),
  })

  const chart =
    data?.departments.map((d) => ({
      name: d.departmentName,
      Environmental: Math.round(d.environmental),
      Social: Math.round(d.social),
      Governance: Math.round(d.governance),
    })) ?? []

  const exportCsv = () =>
    downloadCsv(
      `esg-summary-${data?.period ?? 'current'}.csv`,
      (data?.departments ?? []).map((d) => ({
        Rank: d.rank ?? '',
        Department: d.departmentName,
        Environmental: Math.round(d.environmental),
        Social: Math.round(d.social),
        Governance: Math.round(d.governance),
        Total: Math.round(d.total),
      })),
    )

  type Row = DeptScoreRow & { id: string }
  const tableRows: Row[] = (data?.departments ?? []).map((d) => ({ ...d, id: d.departmentId }))

  const columns: Column<Row>[] = [
    { key: 'rank', label: 'Rank', render: (v) => `#${(v as number) ?? '—'}` },
    {
      key: 'departmentName',
      label: 'Department',
      render: (v) => <span className="font-medium text-brand-text">{v as string}</span>,
    },
    { key: 'environmental', label: 'Env', render: (v) => Math.round(v as number) },
    { key: 'social', label: 'Social', render: (v) => Math.round(v as number) },
    { key: 'governance', label: 'Gov', render: (v) => Math.round(v as number) },
    {
      key: 'total',
      label: 'Total',
      render: (v) => <span className="font-bold text-brand-primary">{Math.round(v as number)}</span>,
    },
  ]

  return (
    <div>
      <PageHeader
        title="ESG Summary"
        subtitle={`Company-wide ESG performance · period ${data?.period ?? ''}`}
      />
      <ReportChrome range={range} onRange={setRange} onExport={exportCsv} />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiTile label="Overall ESG" value={Math.round(data?.overall.total ?? 0)} />
        <KpiTile label="Environmental" value={Math.round(data?.overall.environmental ?? 0)} />
        <KpiTile label="Social" value={Math.round(data?.overall.social ?? 0)} />
        <KpiTile label="Governance" value={Math.round(data?.overall.governance ?? 0)} />
      </div>

      <div className="mb-6">
        <ChartCard title="ESG Pillars by Department">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chart} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
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

      <div className="rounded-xl border border-black/5 bg-white p-4">
        <DataTable columns={columns} data={tableRows} loading={isLoading} />
      </div>
    </div>
  )
}
