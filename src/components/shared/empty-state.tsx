'use client'

export interface EmptyStateProps {
  icon: string
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-14">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-tint-green text-2xl">
        {icon}
      </div>
      <h3 className="mb-1.5 text-[15px] font-semibold text-ink">{title}</h3>
      {description && <p className="mb-6 max-w-sm text-center text-[13px] text-ink-2">{description}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="rounded-[7px] bg-brand-primary px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-brand-primary-dark"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
