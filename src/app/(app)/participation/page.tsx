'use client'

import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ExternalLink } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { ApprovalQueue, type ApprovalItem } from '@/components/shared/approval-queue'
import { DataTable, type Column } from '@/components/shared/data-table'
import { StatusPill } from '@/components/shared/status-pill'
import { useToast } from '@/components/shared/toast'
import { useCurrentUser } from '@/lib/hooks'
import { can } from '@/lib/roles'
import { apiGet, apiPost, ApiError } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import type { ParticipationView } from '@/server/services/social/participation'

export default function ParticipationPage() {
  const { role } = useCurrentUser()
  const { toast } = useToast()
  const qc = useQueryClient()
  const [busyId, setBusyId] = useState<string | null>(null)

  const canDecide = can.approveParticipation(role)

  const { data: rows = [], isLoading } = useQuery<ParticipationView[]>({
    queryKey: ['participation'],
    queryFn: () => apiGet<ParticipationView[]>('/api/participation'),
  })

  const pending = useMemo(() => rows.filter((r) => r.approvalStatus === 'PENDING'), [rows])

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['participation'] })
    qc.invalidateQueries({ queryKey: ['dashboard'] })
    qc.invalidateQueries({ queryKey: ['scoreboard'] })
    qc.invalidateQueries({ queryKey: ['notifications'] })
  }

  const decide = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'approve' | 'reject' }) =>
      apiPost(`/api/participation/${id}/${action}`),
    onMutate: ({ id }) => setBusyId(id),
    onSuccess: (_d, { action }) => {
      toast({
        title: action === 'approve' ? 'Participation approved' : 'Participation rejected',
        description:
          action === 'approve'
            ? 'Points awarded — the Social score has been recalculated.'
            : 'The employee has been notified.',
        variant: action === 'approve' ? 'success' : 'info',
      })
      invalidate()
    },
    onError: (e: ApiError) =>
      toast({ title: 'Action blocked', description: e.message, variant: 'error' }),
    onSettled: () => setBusyId(null),
  })

  const queueItems: ApprovalItem[] = pending.map((p) => ({
    id: p.id,
    personName: p.userName,
    subject: p.activityTitle,
    proofUrl: p.proofUrl,
    points: p.activityPoints,
    status: p.approvalStatus,
  }))

  const columns: Column<ParticipationView>[] = [
    {
      key: 'userName',
      label: 'Employee',
      render: (_v, r) => (
        <div>
          <div className="font-medium text-brand-text">{r.userName ?? '—'}</div>
          <div className="text-xs text-brand-muted">{r.departmentName ?? '—'}</div>
        </div>
      ),
    },
    { key: 'activityTitle', label: 'Activity' },
    {
      key: 'proofUrl',
      label: 'Proof',
      render: (v) =>
        v ? (
          <a
            href={v as string}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-brand-primary hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" /> View
          </a>
        ) : (
          <span className="text-brand-muted">—</span>
        ),
    },
    {
      key: 'pointsEarned',
      label: 'Points',
      render: (v) => <span className="font-medium">+{v as number}</span>,
    },
    {
      key: 'approvalStatus',
      label: 'Status',
      render: (v) => <StatusPill status={v as string} />,
    },
    { key: 'completionDate', label: 'Completed', render: (v) => formatDate(v as Date) },
  ]

  return (
    <div>
      <PageHeader
        title="Employee Participation"
        subtitle="Review CSR submissions and track approval outcomes."
      />

      <section className="mb-8">
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-lg font-semibold text-brand-text">Approval Queue</h2>
          {pending.length > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
              {pending.length} pending
            </span>
          )}
        </div>
        {!canDecide && (
          <p className="mb-3 text-sm text-brand-muted">
            You can view submissions here. Approvals are handled by HR / ESG managers.
          </p>
        )}
        <ApprovalQueue
          items={queueItems}
          loading={isLoading}
          canDecide={canDecide}
          busyId={busyId}
          onApprove={(id) => decide.mutate({ id, action: 'approve' })}
          onReject={(id) => decide.mutate({ id, action: 'reject' })}
          emptyTitle="No pending submissions"
          emptyDescription="Every submission has been reviewed. New joins will appear here."
        />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-brand-text">All Participations</h2>
        <div className="rounded-xl border border-black/5 bg-white p-4">
          <DataTable columns={columns} data={rows} loading={isLoading} />
        </div>
      </section>
    </div>
  )
}
