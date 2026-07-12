/** Tiny classnames joiner (avoids adding clsx as a dependency). */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

/** Current scoring period, e.g. "2026-07". Server + client safe. */
export function currentPeriod(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-US', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Coarse "x days ago" / "in x days" helper for due dates and activity feeds. */
export function relativeDays(value: string | Date | null | undefined): {
  days: number
  label: string
} {
  if (!value) return { days: 0, label: '—' }
  const d = typeof value === 'string' ? new Date(value) : value
  const diffMs = d.getTime() - Date.now()
  const days = Math.round(diffMs / (1000 * 60 * 60 * 24))
  if (days === 0) return { days, label: 'today' }
  if (days > 0) return { days, label: `in ${days}d` }
  return { days, label: `${Math.abs(days)}d overdue` }
}

export function initialsOf(name: string | null | undefined): string {
  return (
    name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'U'
  )
}
