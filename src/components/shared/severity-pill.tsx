'use client'

type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

const styles: Record<Severity, string> = {
  LOW: 'bg-slate-100 text-slate-700',
  MEDIUM: 'bg-amber-100 text-amber-800',
  HIGH: 'bg-orange-100 text-orange-800',
  CRITICAL: 'bg-red-100 text-red-800',
}

export function SeverityPill({ severity }: { severity: string }) {
  const cls = styles[severity as Severity] || styles.MEDIUM
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {severity}
    </span>
  )
}
