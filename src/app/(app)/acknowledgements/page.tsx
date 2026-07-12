'use client'

import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable, type Column } from '@/components/shared/data-table'
import { apiGet } from '@/lib/api'
import { formatDateTime, initialsOf } from '@/lib/utils'
import type { AcknowledgementView } from '@/server/services/governance/acknowledgements'

export default function AcknowledgementsPage() {
  const { data = [], isLoading } = useQuery<AcknowledgementView[]>({
    queryKey: ['acknowledgements'],
    queryFn: () => apiGet<AcknowledgementView[]>('/api/acknowledgements'),
  })

  const columns: Column<AcknowledgementView>[] = [
    {
      key: 'userName',
      label: 'Employee',
      render: (v) => (
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-primary/10 text-[11px] font-semibold text-brand-primary-dark">
            {initialsOf(v as string)}
          </span>
          <span className="font-medium text-brand-text">{(v as string) ?? '—'}</span>
        </div>
      ),
    },
    { key: 'policyTitle', label: 'Policy' },
    {
      key: 'acknowledgedAt',
      label: 'Acknowledged',
      sortable: true,
      render: (v) => formatDateTime(v as Date),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Policy Acknowledgements"
        subtitle="A record of every policy acceptance across the organization."
      />
      <div className="rounded-xl border border-black/5 bg-white p-4">
        <DataTable columns={columns} data={data} loading={isLoading} />
      </div>
    </div>
  )
}
