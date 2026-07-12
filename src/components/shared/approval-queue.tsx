'use client'

import { Check, X } from 'lucide-react'
import { StatusPill } from './status-pill'
import { EmptyState } from './empty-state'
import { ProofButton } from './proof-viewer'
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
          <div key={i} className="animate-es-shimmer h-16 rounded-lg bg-track" />
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
        className="inline-flex items-center gap-1 rounded-md border border-pill-red-fg/30 bg-surface px-2.5 py-1 text-xs font-semibold text-pill-red-fg transition hover:bg-pill-red-bg disabled:opacity-50"
      >
        <X className="h-3.5 w-3.5" /> Reject
      </button>
    </div>
  )

  const Proof = ({ url }: { url?: string | null }) =>
    url ? (
      <ProofButton url={url} />
    ) : (
      <span className="text-xs text-ink-2">No proof</span>
    )

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface">
      {/* Desktop table */}
      <table className="hidden w-full text-sm sm:table">
        <thead className="border-b border-line bg-canvas text-left text-[11px] uppercase tracking-wide text-faint">
          <tr>
            <th className="px-4 py-3 font-semibold">Employee</th>
            <th className="px-4 py-3 font-semibold">Activity</th>
            <th className="px-4 py-3 font-semibold">Proof</th>
            <th className="px-4 py-3 font-semibold">Points</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            {canDecide && <th className="px-4 py-3 font-semibold">Decision</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-line-soft">
          {items.map((it) => (
            <tr key={it.id} className="hover:bg-accent-soft">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-tint-green text-[11px] font-semibold text-pill-green-fg">
                    {initialsOf(it.personName)}
                  </span>
                  <span className="font-medium text-ink">{it.personName ?? '—'}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-ink">{it.subject ?? '—'}</td>
              <td className="px-4 py-3">
                <Proof url={it.proofUrl} />
              </td>
              <td className="px-4 py-3 font-medium text-ink">
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
                    <span className="text-xs text-ink-2">Decided</span>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile cards */}
      <div className="divide-y divide-line-soft sm:hidden">
        {items.map((it) => (
          <div key={it.id} className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-tint-green text-xs font-semibold text-pill-green-fg">
                  {initialsOf(it.personName)}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">{it.personName ?? '—'}</p>
                  <p className="truncate text-xs text-ink-2">{it.subject ?? '—'}</p>
                </div>
              </div>
              <StatusPill status={it.status} />
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-4 text-xs">
                <Proof url={it.proofUrl} />
                <span className="font-medium text-ink">
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
