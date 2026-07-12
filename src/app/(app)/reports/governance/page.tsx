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
import { SeverityPill } from '@/components/shared/severity-pill'
import { ReportChrome, rangeStart, type TimeRange } from '@/components/shared/report-chrome'
import { apiGet } from '@/lib/api'
import { downloadCsv } from '@/lib/csv'
import { formatDate } from '@/lib/utils'
import type { DashboardSummary } from '@/server/services/dashboard'
import type { ComplianceIssueView } from '@/server/services/governance/compliance'

export default function GovernanceReportPage() {
  const [range, setRange] = useState<TimeRange>('fy')

  const { data: summary } = useQuery<DashboardSummary>({
    queryKey: ['dashboard'],
    queryFn: () => apiGet<DashboardSummary>('/api/dashboard/summary'),
  })
  const { data: issues = [], isLoading } = useQuery<ComplianceIssueView[]>({
    queryKey: ['compliance-issues'],
    queryFn: () => apiGet<ComplianceIssueView[]>('/api/compliance-issues'),
  })

  const filtered = useMemo(() => {
    const start = rangeStart(range).getTime()
    return issues.filter((i) => new Date(i.createdAt).getTime() >= start)
  }, [issues, range])

  const open = filtered.filter((i) => i.status !== 'RESOLVED').length
  const overdue = filtered.filter((i) => i.overdue).length

  const chart =
    summary?.departments.map((d) => ({
      name: d.departmentName,
      score: Math.round(d.governance),
    })) ?? []

  const exportCsv = () =>
    downloadCsv(
      `governance-report-${range}.csv`,
      filtered.map((i) => ({
        Issue: i.description,
        Severity: i.severity,
        Department: i.departmentName ?? '',
        Owner: i.ownerName ?? '',
        Due: formatDate(i.dueDate),
        Status: i.status,
        Overdue: i.overdue ? 'YES' : 'no',
      })),
    )

  const columns: Column<ComplianceIssueView>[] = [
    { key: 'description', label: 'Issue' },
    { key: 'severity', label: 'Severity', render: (v) => <SeverityPill severity={v as string} /> },
    { key: 'ownerName', label: 'Owner', render: (v) => (v as string) ?? '—' },
    { key: 'dueDate', label: 'Due', render: (v) => formatDate(v as Date) },
    { key: 'status', label: 'Status', render: (v) => <StatusPill status={v as string} /> },
  ]

  return (
    <div>
      <PageHeader
        title="Governance Report"
        subtitle="Compliance, policy acknowledgement and Governance pillar performance."
      />
      <ReportChrome range={range} onRange={setRange} onExport={exportCsv} />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiTile label="Issue Closure Rate" value={`${summary?.kpis.issueClosureRate ?? 0}%`} />
        <KpiTile label="Open Issues" value={open} />
        <KpiTile label="Overdue" value={overdue} />
        <KpiTile label="Total Issues" value={filtered.length} />
      </div>

      <div className="mb-6">
        <ChartCard title="Governance Score by Department">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chart} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#9ca3af" />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} stroke="#9ca3af" />
              <Tooltip cursor={{ fill: 'rgba(79,122,90,0.08)' }} />
              <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                {chart.map((_, i) => (
                  <Cell key={i} fill="#33503c" />
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
