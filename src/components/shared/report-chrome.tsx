'use client'

import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

export type TimeRange = 'month' | 'quarter' | 'fy'

const RANGES: { key: TimeRange; label: string }[] = [
  { key: 'month', label: 'This month' },
  { key: 'quarter', label: 'This quarter' },
  { key: 'fy', label: 'FY26' },
]

/** Start date for a time range, used to filter dated records in reports. */
export function rangeStart(range: TimeRange): Date {
  const now = new Date()
  if (range === 'month') return new Date(now.getFullYear(), now.getMonth(), 1)
  if (range === 'quarter') {
    const q = Math.floor(now.getMonth() / 3) * 3
    return new Date(now.getFullYear(), q, 1)
  }
  return new Date(now.getFullYear(), 0, 1)
}

export function ReportChrome({
  range,
  onRange,
  onExport,
}: {
  range: TimeRange
  onRange: (r: TimeRange) => void
  onExport: () => void
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="inline-flex rounded-lg border border-black/10 bg-white p-1">
        {RANGES.map((r) => (
          <button
            key={r.key}
            onClick={() => onRange(r.key)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              range === r.key
                ? 'bg-brand-primary text-white'
                : 'text-brand-muted hover:text-brand-text'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
      <Button variant="outline" onClick={onExport}>
        <Download className="mr-1 h-4 w-4" /> Export CSV
      </Button>
    </div>
  )
}
