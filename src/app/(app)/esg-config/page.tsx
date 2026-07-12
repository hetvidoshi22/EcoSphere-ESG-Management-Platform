'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FormField } from '@/components/shared/form-field'

interface EsgConfig {
  id: string
  weightEnvironmental: number
  weightSocial: number
  weightGovernance: number
  autoEmissionCalc: boolean
  evidenceRequired: boolean
  badgeAutoAward: boolean
  emailAlerts: boolean
  xpEasy: number
  xpMedium: number
  xpHard: number
  streakBonusEnabled: boolean
  deptMultiplierEnabled: boolean
  earlyBirdEnabled: boolean
}

const inputCls =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-brand-primary'

async function getConfig(): Promise<EsgConfig> {
  const res = await fetch('/api/esg-config')
  if (!res.ok) throw new Error('Failed to load config')
  return res.json()
}

export function Toggle({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string
  description?: string
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <label className={`flex items-start justify-between gap-4 py-3 ${disabled ? 'opacity-60' : 'cursor-pointer'}`}>
      <div>
        <div className="text-sm font-medium text-gray-900">{label}</div>
        {description && <div className="text-xs text-gray-500 mt-0.5">{description}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
          checked ? 'bg-brand-primary' : 'bg-gray-300'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
            checked ? 'translate-x-5' : ''
          }`}
        />
      </button>
    </label>
  )
}

export default function EsgConfigPage() {
  const { data: session } = useSession()
  const isAdmin = (session?.user as any)?.role === 'ADMIN'
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({ queryKey: ['esg-config'], queryFn: getConfig })
  const [form, setForm] = useState<EsgConfig | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (data) setForm(data)
  }, [data])

  const weightSum = form
    ? Math.round((form.weightEnvironmental + form.weightSocial + form.weightGovernance) * 1000) / 1000
    : 0
  const sumValid = Math.abs(weightSum - 1) <= 0.001

  const save = useMutation({
    mutationFn: async () => {
      if (!form) return
      const res = await fetch('/api/esg-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weightEnvironmental: form.weightEnvironmental,
          weightSocial: form.weightSocial,
          weightGovernance: form.weightGovernance,
          autoEmissionCalc: form.autoEmissionCalc,
          evidenceRequired: form.evidenceRequired,
          badgeAutoAward: form.badgeAutoAward,
          emailAlerts: form.emailAlerts,
          xpEasy: form.xpEasy,
          xpMedium: form.xpMedium,
          xpHard: form.xpHard,
          streakBonusEnabled: form.streakBonusEnabled,
          deptMultiplierEnabled: form.deptMultiplierEnabled,
          earlyBirdEnabled: form.earlyBirdEnabled,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        const detail = body.details?.[0]?.message
        throw new Error(detail || body.error || 'Save failed')
      }
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['esg-config'] })
      setError(null)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    },
    onError: (e: Error) => setError(e.message),
  })

  if (isLoading || !form) return <div className="text-gray-500">Loading configuration…</div>

  const num = (v: string) => (v === '' ? 0 : Number(v))

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold text-gray-900">ESG Configuration</h1>
      <p className="text-sm text-gray-600 mt-1 mb-8">
        Scoring weights, XP rules, and platform toggles.
        {!isAdmin && ' (read-only — admin access required to edit)'}
      </p>

      {/* Weights */}
      <section className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Pillar Weights</h2>
        <div className="grid grid-cols-3 gap-4">
          <FormField label="Environmental">
            <input
              type="number" step="0.05" min="0" max="1" disabled={!isAdmin}
              className={inputCls}
              value={form.weightEnvironmental}
              onChange={(e) => setForm({ ...form, weightEnvironmental: num(e.target.value) })}
            />
          </FormField>
          <FormField label="Social">
            <input
              type="number" step="0.05" min="0" max="1" disabled={!isAdmin}
              className={inputCls}
              value={form.weightSocial}
              onChange={(e) => setForm({ ...form, weightSocial: num(e.target.value) })}
            />
          </FormField>
          <FormField label="Governance">
            <input
              type="number" step="0.05" min="0" max="1" disabled={!isAdmin}
              className={inputCls}
              value={form.weightGovernance}
              onChange={(e) => setForm({ ...form, weightGovernance: num(e.target.value) })}
            />
          </FormField>
        </div>
        <div className={`mt-3 text-sm ${sumValid ? 'text-green-700' : 'text-red-600'}`}>
          Sum: {weightSum.toFixed(3)} {sumValid ? '✓ (must equal 1.0)' : '✗ must equal 1.0 (±0.001)'}
        </div>
      </section>

      {/* XP rules */}
      <section className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">XP Rules</h2>
        <div className="grid grid-cols-3 gap-4">
          <FormField label="Easy">
            <input type="number" min="0" disabled={!isAdmin} className={inputCls}
              value={form.xpEasy} onChange={(e) => setForm({ ...form, xpEasy: num(e.target.value) })} />
          </FormField>
          <FormField label="Medium">
            <input type="number" min="0" disabled={!isAdmin} className={inputCls}
              value={form.xpMedium} onChange={(e) => setForm({ ...form, xpMedium: num(e.target.value) })} />
          </FormField>
          <FormField label="Hard">
            <input type="number" min="0" disabled={!isAdmin} className={inputCls}
              value={form.xpHard} onChange={(e) => setForm({ ...form, xpHard: num(e.target.value) })} />
          </FormField>
        </div>
        <div className="mt-2 divide-y divide-gray-100">
          <Toggle label="Streak bonus" description="+10% after 4 consecutive weeks"
            checked={form.streakBonusEnabled} disabled={!isAdmin}
            onChange={(v) => setForm({ ...form, streakBonusEnabled: v })} />
          <Toggle label="Department multiplier" description="Lowest-scoring dept earns 1.15×"
            checked={form.deptMultiplierEnabled} disabled={!isAdmin}
            onChange={(v) => setForm({ ...form, deptMultiplierEnabled: v })} />
          <Toggle label="Early-bird bonus" description="+20 XP if joined within 48h"
            checked={form.earlyBirdEnabled} disabled={!isAdmin}
            onChange={(v) => setForm({ ...form, earlyBirdEnabled: v })} />
        </div>
      </section>

      {/* Platform toggles */}
      <section className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Platform</h2>
        <div className="divide-y divide-gray-100">
          <Toggle label="Auto emission calculation" description="Compute CO₂e automatically on carbon entries"
            checked={form.autoEmissionCalc} disabled={!isAdmin}
            onChange={(v) => setForm({ ...form, autoEmissionCalc: v })} />
          <Toggle label="Evidence required" description="Require proof for participation approval"
            checked={form.evidenceRequired} disabled={!isAdmin}
            onChange={(v) => setForm({ ...form, evidenceRequired: v })} />
          <Toggle label="Badge auto-award" description="Award badges automatically on unlock"
            checked={form.badgeAutoAward} disabled={!isAdmin}
            onChange={(v) => setForm({ ...form, badgeAutoAward: v })} />
          <Toggle label="Email alerts" description="Send email notifications"
            checked={form.emailAlerts} disabled={!isAdmin}
            onChange={(v) => setForm({ ...form, emailAlerts: v })} />
        </div>
      </section>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
          {error}
        </div>
      )}

      {isAdmin && (
        <div className="flex items-center gap-3">
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending || !sumValid}
            className="px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {save.isPending ? 'Saving…' : 'Save Configuration'}
          </button>
          {saved && <span className="text-sm text-green-700">Saved ✓</span>}
          {!sumValid && <span className="text-sm text-red-600">Fix weights before saving</span>}
        </div>
      )}
    </div>
  )
}
