'use client'

import { Check, X, ExternalLink } from 'lucide-react'
import { StatusPill } from './status-pill'
import { EmptyState } from './empty-state'
import { initialsOf } from '@/lib/utils'

export interface ApprovalItem {
  id: string
  personName: string | null
  subject: string | null
  proofUrl?: string | null
  points?: number | null
  status: string
}

interface ApprovalQueueProps {
  items: ApprovalItem[]
  loading?: boolean
  onApprove: (id: string) => void
  onReject: (id: string) => void
  busyId?: string | null
  canDecide?: boolean
  pointsLabel?: string
  emptyTitle?: string
  emptyDescription?: string
}

/**
 * Reusable approve/reject queue (owner: Hetvi). Used by CSR Employee
 * Participation and reusable for Challenge Participation. Only shows the
 * decision buttons on PENDING rows when the viewer `canDecide`.
 */
export function ApprovalQueue({
  items,
  loading = false,
  onApprove,
  onReject,
  busyId,
  canDecide = false,
  pointsLabel = 'pts',
  emptyTitle = 'Nothing to review',
  emptyDescription = 'Approved and rejected items will appear in the full list below.',
}: ApprovalQueueProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-black/5" />
        ))}
      </div>
    )
  }

  if (!items.length) {
    return <EmptyState icon="✅" title={emptyTitle} description={emptyDescription} />
  }

  const Decision = ({ id }: { id: string }) => (
    <div className="flex gap-2">
      <button
        onClick={() => onApprove(id)}
        disabled={busyId === id}
        className="inline-flex items-center gap-1 rounded-md bg-brand-primary px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-brand-primary-dark disabled:opacity-50"
      >
        <Check className="h-3.5 w-3.5" /> Approve
      </button>
      <button
        onClick={() => onReject(id)}
        disabled={busyId === id}
        className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
      >
        <X className="h-3.5 w-3.5" /> Reject
      </button>
    </div>
  )

  const Proof = ({ url }: { url?: string | null }) =>
    url ? (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 text-xs font-medium text-brand-primary hover:underline"
      >
        <ExternalLink className="h-3.5 w-3.5" /> View
      </a>
    ) : (
      <span className="text-xs text-brand-muted">No proof</span>
    )

  return (
    <div className="overflow-hidden rounded-xl border border-black/5 bg-white">
      {/* Desktop table */}
      <table className="hidden w-full text-sm sm:table">
        <thead className="border-b border-black/5 bg-brand-surface/60 text-left text-[11px] uppercase tracking-wide text-brand-muted">
          <tr>
            <th className="px-4 py-3 font-semibold">Employee</th>
            <th className="px-4 py-3 font-semibold">Activity</th>
            <th className="px-4 py-3 font-semibold">Proof</th>
            <th className="px-4 py-3 font-semibold">Points</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            {canDecide && <th className="px-4 py-3 font-semibold">Decision</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-black/5">
          {items.map((it) => (
            <tr key={it.id} className="hover:bg-brand-surface/40">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-primary/10 text-[11px] font-semibold text-brand-primary-dark">
                    {initialsOf(it.personName)}
                  </span>
                  <span className="font-medium text-brand-text">{it.personName ?? '—'}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-brand-text">{it.subject ?? '—'}</td>
              <td className="px-4 py-3">
                <Proof url={it.proofUrl} />
              </td>
              <td className="px-4 py-3 font-medium text-brand-text">
                +{it.points ?? 0} {pointsLabel}
              </td>
              <td className="px-4 py-3">
                <StatusPill status={it.status} />
              </td>
              {canDecide && (
                <td className="px-4 py-3">
                  {it.status === 'PENDING' ? (
                    <Decision id={it.id} />
                  ) : (
                    <span className="text-xs text-brand-muted">Decided</span>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile cards */}
      <div className="divide-y divide-black/5 sm:hidden">
        {items.map((it) => (
          <div key={it.id} className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-primary/10 text-xs font-semibold text-brand-primary-dark">
                  {initialsOf(it.personName)}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium text-brand-text">{it.personName ?? '—'}</p>
                  <p className="truncate text-xs text-brand-muted">{it.subject ?? '—'}</p>
                </div>
              </div>
              <StatusPill status={it.status} />
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-4 text-xs">
                <Proof url={it.proofUrl} />
                <span className="font-medium text-brand-text">
                  +{it.points ?? 0} {pointsLabel}
                </span>
              </div>
              {canDecide && it.status === 'PENDING' && <Decision id={it.id} />}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
