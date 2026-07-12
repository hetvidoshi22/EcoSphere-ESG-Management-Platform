'use client'

import { useQuery } from '@tanstack/react-query'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  Legend,
} from 'recharts'
import { Users, Building2, ShieldCheck } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { ChartCard } from '@/components/shared/chart-card'
import { apiGet } from '@/lib/api'
import type { DiversityView } from '@/server/services/social/diversity'

const PALETTE = ['#4f7a5a', '#6b9b78', '#8fb89a', '#33503c', '#b7c7ab', '#3d5f46']

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  ESG_MANAGER: 'ESG Manager',
  HR_MANAGER: 'HR Manager',
  AUDITOR: 'Auditor',
  COMPLIANCE_OFFICER: 'Compliance',
  EMPLOYEE: 'Employee',
}

function StatTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: number | string
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-black/5 bg-white p-5">
      <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
        {icon}
      </span>
      <div>
        <div className="text-2xl font-bold text-brand-text">{value}</div>
        <div className="text-sm text-brand-muted">{label}</div>
      </div>
    </div>
  )
}

export default function DiversityPage() {
  const { data, isLoading } = useQuery<DiversityView>({
    queryKey: ['diversity'],
    queryFn: () => apiGet<DiversityView>('/api/diversity'),
  })

  const roleData =
    data?.byRole.map((r) => ({ name: ROLE_LABELS[r.role] ?? r.role, value: r.count })) ?? []

  return (
    <div>
      <PageHeader
        title="Diversity"
        subtitle="Read-only workforce headcount and role distribution across the organization."
      />

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-black/5" />
          ))}
        </div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatTile icon={<Users className="h-5 w-5" />} label="Total employees" value={data?.total ?? 0} />
            <StatTile
              icon={<Building2 className="h-5 w-5" />}
              label="Departments"
              value={data?.byDepartment.length ?? 0}
            />
            <StatTile
              icon={<ShieldCheck className="h-5 w-5" />}
              label="Distinct roles"
              value={data?.byRole.length ?? 0}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ChartCard title="Headcount by Department">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data?.byDepartment ?? []} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
                  <XAxis dataKey="department" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#9ca3af" />
                  <Tooltip cursor={{ fill: 'rgba(79,122,90,0.08)' }} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {(data?.byDepartment ?? []).map((_, i) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Role Distribution">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={roleData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={55}
                    paddingAngle={2}
                  >
                    {roleData.map((_, i) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </>
      )}
    </div>
  )
}
