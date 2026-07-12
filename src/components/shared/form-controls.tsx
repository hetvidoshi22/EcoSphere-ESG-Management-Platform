'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

const base =
  'w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-brand-text outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/30 disabled:opacity-60'

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(base, className)} {...props} />
  ),
)
Input.displayName = 'Input'

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea ref={ref} rows={3} className={cn(base, 'resize-y', className)} {...props} />
))
Textarea.displayName = 'Textarea'

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select ref={ref} className={cn(base, 'cursor-pointer', className)} {...props}>
    {children}
  </select>
))
Select.displayName = 'Select'

export function Checkbox({
  label,
  description,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; description?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-black/20 accent-brand-primary"
        {...props}
      />
      <span>
        <span className="block text-sm font-medium text-brand-text">{label}</span>
        {description && <span className="block text-xs text-brand-muted">{description}</span>}
      </span>
    </label>
  )
}
