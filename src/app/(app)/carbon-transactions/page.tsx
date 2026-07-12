'use client'

import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { Plus, Trash2, Search, X, CheckCircle, ShieldCheck, AlertCircle } from 'lucide-react'

// ---------- Types ----------
type EmissionFactor = { id: string; name: string; unit: string; co2PerUnit: number; status: string }
type Department = { id: string; name: string }
type CarbonTx = {
  id: string; reference: string; sourceModule: string; product: string | null
  quantity: number; calculatedCo2: number; departmentId: string; departmentName: string | null
  emissionFactorId: string; emissionFactorName: string | null; emissionFactorUnit: string | null
  date: string; status: string
}
type KpiData = { totalCo2: number; totalCount: number; needsReviewCount: number }
type FormValues = {
  sourceModule: string; product: string; quantity: number
  emissionFactorId: string; departmentId: string; date: string
}

// ---------- Status step indicator ----------
const STATUS_STEPS = ['DRAFT', 'CONFIRMED', 'VALIDATED', 'POSTED']
const STATUS_LABELS: Record<string, string> = { DRAFT: 'Draft', CONFIRMED: 'Confirmed', VALIDATED: 'Validated', POSTED: 'Posted', NEEDS_REVIEW: 'Needs Review' }
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  DRAFT:        { bg: 'bg-gray-100',    text: 'text-gray-600'   },
  CONFIRMED:    { bg: 'bg-blue-50',     text: 'text-blue-700'   },
  VALIDATED:    { bg: 'bg-emerald-50',  text: 'text-emerald-700'},
  POSTED:       { bg: 'bg-purple-50',   text: 'text-purple-700' },
  NEEDS_REVIEW: { bg: 'bg-amber-50',    text: 'text-amber-700'  },
}
const STATUS_NEXT: Record<string, { label: string; next: string; Icon: typeof CheckCircle }> = {
  DRAFT:        { label: 'Confirm',    next: 'CONFIRMED', Icon: CheckCircle  },
  CONFIRMED:    { label: 'Validate',   next: 'VALIDATED', Icon: ShieldCheck  },
  NEEDS_REVIEW: { label: 'Re-confirm', next: 'CONFIRMED', Icon: AlertCircle  },
}

function StatusPill({ status }: { status: string }) {
  const c = STATUS_COLORS[status] ?? { bg: 'bg-gray-100', text: 'text-gray-600' }
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>{STATUS_LABELS[status] ?? status}</span>
}

function StepIndicator({ status }: { status: string }) {
  const idx = STATUS_STEPS.indexOf(status)
  return (
    <div className="flex items-center gap-0 mb-6">
      {STATUS_STEPS.map((step, i) => (
        <div key={step} className="flex items-center">
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${i < idx ? 'bg-[#4F7A5A] text-white' : i === idx ? 'bg-[#4F7A5A] text-white ring-2 ring-[#4F7A5A] ring-offset-2' : 'bg-gray-100 text-gray-400'}`}>
            {i < idx && <CheckCircle className="w-3.5 h-3.5" />}
            <span>{i + 1}</span>
            <span className="hidden sm:inline">{STATUS_LABELS[step]}</span>
          </div>
          {i < STATUS_STEPS.length - 1 && (
            <div className={`h-px w-8 mx-1 ${i < idx ? 'bg-[#4F7A5A]' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

// ---------- KPI Tile ----------
function KpiCard({ label, value, sub, color = 'default' }: { label: string; value: string | number; sub?: string; color?: 'default' | 'warning' | 'success' }) {
  const colorMap = { default: 'text-gray-900', warning: 'text-amber-600', success: 'text-emerald-600' }
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${colorMap[color]}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

export default function CarbonTransactionsPage() {
  const qc = useQueryClient()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selected, setSelected] = useState<CarbonTx | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CarbonTx | null>(null)
  const [search, setSearch] = useState('')
  const [livePreview, setLivePreview] = useState<number | null>(null)

  const { data: transactions = [], isLoading } = useQuery<CarbonTx[]>({
    queryKey: ['carbon'], queryFn: () => fetch('/api/carbon').then(r => r.json()),
  })
  const { data: kpis } = useQuery<KpiData>({
    queryKey: ['carbon-kpis'], queryFn: () => fetch('/api/carbon?kpis=true').then(r => r.json()),
    refetchInterval: 30_000,
  })
  const { data: factors = [] } = useQuery<EmissionFactor[]>({
    queryKey: ['emission-factors'], queryFn: () => fetch('/api/emission-factors').then(r => r.json()),
  })
  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['departments'], queryFn: () => fetch('/api/departments').then(r => r.json()),
  })

  const factorMap = useMemo(() => Object.fromEntries(factors.map(f => [f.id, f])), [factors])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return q ? transactions.filter(t => t.reference.toLowerCase().includes(q) || t.sourceModule.toLowerCase().includes(q) || (t.product ?? '').toLowerCase().includes(q) || (t.departmentName ?? '').toLowerCase().includes(q)) : transactions
  }, [transactions, search])

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormValues>({
    defaultValues: { sourceModule: 'Manual', product: '', quantity: 1, emissionFactorId: '', departmentId: '', date: new Date().toISOString().split('T')[0] },
  })

  const watchedFactorId = useWatch({ control, name: 'emissionFactorId' })
  const watchedQty = useWatch({ control, name: 'quantity' })

  useEffect(() => {
    const f = factorMap[watchedFactorId]; const q = Number(watchedQty)
    setLivePreview(f && q > 0 ? q * f.co2PerUnit : null)
  }, [watchedFactorId, watchedQty, factorMap])

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = { ...values, quantity: Number(values.quantity) }
      const url = selected ? `/api/carbon/${selected.id}` : '/api/carbon'
      return fetch(url, { method: selected ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(r => r.json())
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['carbon'] }); qc.invalidateQueries({ queryKey: ['carbon-kpis'] }); closeDrawer() },
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      fetch(`/api/carbon/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['carbon'] }); qc.invalidateQueries({ queryKey: ['carbon-kpis'] }); qc.invalidateQueries({ queryKey: ['goals'] }); closeDrawer() },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/carbon/${id}`, { method: 'DELETE' }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['carbon'] }); qc.invalidateQueries({ queryKey: ['carbon-kpis'] }); setDeleteTarget(null) },
  })

  const openCreate = () => { setSelected(null); reset({ sourceModule: 'Manual', product: '', quantity: 1, emissionFactorId: factors[0]?.id ?? '', departmentId: departments[0]?.id ?? '', date: new Date().toISOString().split('T')[0] }); setLivePreview(null); setDrawerOpen(true) }
  const openEdit = (item: CarbonTx) => { setSelected(item); reset({ sourceModule: item.sourceModule, product: item.product ?? '', quantity: item.quantity, emissionFactorId: item.emissionFactorId, departmentId: item.departmentId, date: new Date(item.date).toISOString().split('T')[0] }); setLivePreview(null); setDrawerOpen(true) }
  const closeDrawer = () => { setDrawerOpen(false); setSelected(null); setLivePreview(null) }

  const nextAction = selected ? STATUS_NEXT[selected.status] : null

  return (
    <div className="min-h-full bg-[#F7F6F1]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Carbon Transactions</h1>
          <p className="text-sm text-gray-500 mt-0.5">{isLoading ? '…' : `${transactions.length} records`} · Track emissions across all departments</p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4F7A5A] text-white text-sm font-medium hover:bg-[#3d6147] transition-colors">
          <Plus className="w-4 h-4" />Log Carbon Data
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <KpiCard label="Total CO₂e This Month" value={`${(kpis?.totalCo2 ?? 0).toFixed(1)} kg`} sub="auto-calculated from emission factors" />
        <KpiCard label="Transactions This Month" value={kpis?.totalCount ?? 0} sub="logged across all modules" />
        <KpiCard label="Needs Review" value={kpis?.needsReviewCount ?? 0} color={kpis?.needsReviewCount ? 'warning' : 'default'} sub="transactions requiring action" />
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg flex-1 max-w-xs shadow-sm">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input type="text" placeholder="Search reference, module, product…" value={search} onChange={e => setSearch(e.target.value)} className="flex-1 text-sm bg-transparent outline-none placeholder:text-gray-400" />
          {search && <button onClick={() => setSearch('')}><X className="w-3.5 h-3.5 text-gray-400" /></button>}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">Reference</th>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">Module</th>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">Product</th>
              <th className="text-right text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">Quantity</th>
              <th className="text-right text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">CO₂e (kg)</th>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">Department</th>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">Date</th>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">Status</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? [...Array(6)].map((_, i) => (
              <tr key={i}>{[...Array(9)].map((_, j) => <td key={j} className="px-5 py-3.5"><div className="h-4 bg-gray-100 rounded animate-pulse w-3/4" /></td>)}</tr>
            )) : filtered.length === 0 ? (
              <tr><td colSpan={9} className="px-5 py-20 text-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-[#4F7A5A]/10 flex items-center justify-center">
                    <span className="text-2xl">🌿</span>
                  </div>
                  <p className="text-sm font-medium text-gray-500">No carbon transactions yet</p>
                  <p className="text-xs text-gray-400">Log your first record manually or import from fleet and energy systems.</p>
                  <button onClick={openCreate} className="mt-1 px-4 py-2 text-sm font-medium text-white bg-[#4F7A5A] rounded-lg hover:bg-[#3d6147] transition-colors">+ Log Carbon Data</button>
                </div>
              </td></tr>
            ) : filtered.map(tx => (
              <tr key={tx.id} onClick={() => openEdit(tx)} className="hover:bg-[#F7F6F1] cursor-pointer transition-colors group">
                <td className="px-5 py-3.5 font-mono text-xs font-semibold text-[#4F7A5A]">{tx.reference}</td>
                <td className="px-5 py-3.5 text-gray-600">{tx.sourceModule}</td>
                <td className="px-5 py-3.5 text-gray-600">{tx.product ?? <span className="text-gray-300">—</span>}</td>
                <td className="px-5 py-3.5 text-right font-mono text-gray-700">{tx.quantity} {tx.emissionFactorUnit}</td>
                <td className="px-5 py-3.5 text-right font-bold text-gray-900 font-mono">{Number(tx.calculatedCo2).toFixed(1)}</td>
                <td className="px-5 py-3.5 text-gray-500 text-xs">{tx.departmentName ?? <span className="text-gray-300">—</span>}</td>
                <td className="px-5 py-3.5 text-gray-500 text-xs">{new Date(tx.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                <td className="px-5 py-3.5"><StatusPill status={tx.status} /></td>
                <td className="px-5 py-3.5">
                  <button onClick={e => { e.stopPropagation(); setDeleteTarget(tx) }} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={closeDrawer} />
          <div className="w-[500px] bg-white shadow-2xl flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  {selected ? selected.reference : 'New Carbon Transaction'}
                </h2>
                {selected && <div className="flex items-center gap-2 mt-1"><StatusPill status={selected.status} /></div>}
              </div>
              <button onClick={closeDrawer} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {/* Step indicator for existing */}
              {selected && STATUS_STEPS.includes(selected.status) && <StepIndicator status={selected.status} />}

              <form className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Source Module <span className="text-red-500">*</span></label>
                  <select {...register('sourceModule')} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#4F7A5A] focus:ring-2 focus:ring-[#4F7A5A]/15 bg-white transition">
                    {['Manual','Fleet','Purchase','Expense','Manufacturing'].map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Product / Description</label>
                  <input {...register('product')} placeholder="e.g. Diesel — Van #4, Grid electricity — HQ"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#4F7A5A] focus:ring-2 focus:ring-[#4F7A5A]/15 transition" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">Quantity <span className="text-red-500">*</span></label>
                    <input type="number" step="0.01" {...register('quantity', { required: true, valueAsNumber: true, validate: v => Number(v) > 0 || 'Must be > 0' })}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#4F7A5A] focus:ring-2 focus:ring-[#4F7A5A]/15 font-mono transition" />
                    {errors.quantity && <p className="text-xs text-red-500">Must be greater than 0</p>}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">Emission Factor <span className="text-red-500">*</span></label>
                    <select {...register('emissionFactorId', { required: true })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#4F7A5A] focus:ring-2 focus:ring-[#4F7A5A]/15 bg-white transition">
                      <option value="">— Select —</option>
                      {factors.filter(f => f.status === 'ACTIVE').map(f => <option key={f.id} value={f.id}>{f.name} ({f.unit})</option>)}
                    </select>
                    {errors.emissionFactorId && <p className="text-xs text-red-500">Required</p>}
                  </div>
                </div>

                {/* Live CO₂ preview */}
                {livePreview !== null && (
                  <div className="flex items-center justify-between p-4 bg-[#F7F6F1] border border-[#4F7A5A]/20 rounded-xl">
                    <div>
                      <p className="text-xs font-semibold text-[#4F7A5A] uppercase tracking-wider">Calculated CO₂e</p>
                      <p className="text-xs text-gray-500 mt-0.5">{watchedQty} × {factorMap[watchedFactorId]?.co2PerUnit} kg/unit · auto-calculated</p>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{livePreview.toFixed(1)} <span className="text-sm font-normal text-gray-500">kg</span></p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">Department <span className="text-red-500">*</span></label>
                    <select {...register('departmentId', { required: true })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#4F7A5A] focus:ring-2 focus:ring-[#4F7A5A]/15 bg-white transition">
                      <option value="">— Select —</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                    {errors.departmentId && <p className="text-xs text-red-500">Required</p>}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">Date <span className="text-red-500">*</span></label>
                    <input type="date" {...register('date', { required: true })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#4F7A5A] focus:ring-2 focus:ring-[#4F7A5A]/15 transition" />
                  </div>
                </div>

                {/* Status action */}
                {selected && nextAction && (
                  <div className="pt-2 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Actions</p>
                    <button
                      type="button"
                      disabled={statusMutation.isPending}
                      onClick={() => statusMutation.mutate({ id: selected.id, status: nextAction.next })}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#4F7A5A] text-[#4F7A5A] text-sm font-medium hover:bg-[#4F7A5A] hover:text-white transition-colors disabled:opacity-60"
                    >
                      <nextAction.Icon className="w-4 h-4" />
                      {statusMutation.isPending ? 'Processing…' : nextAction.label}
                    </button>
                  </div>
                )}
              </form>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
              <button type="button" onClick={closeDrawer} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Discard</button>
              <button onClick={handleSubmit(v => saveMutation.mutate(v))} disabled={saveMutation.isPending} className="px-5 py-2 text-sm font-medium text-white bg-[#4F7A5A] rounded-lg hover:bg-[#3d6147] disabled:opacity-60 transition-colors">
                {saveMutation.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <div className="flex items-start gap-4">
              <div className="p-2.5 bg-red-50 rounded-xl shrink-0"><Trash2 className="w-5 h-5 text-red-500" /></div>
              <div>
                <h3 className="font-semibold text-gray-900">Delete transaction {deleteTarget.reference}?</h3>
                <p className="text-sm text-gray-500 mt-1">This removes the record and its {Number(deleteTarget.calculatedCo2).toFixed(1)} kg CO₂e from all reports. This action cannot be undone.</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={() => deleteMutation.mutate(deleteTarget.id)} disabled={deleteMutation.isPending} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-60">
                {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
