'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Plus, Trash2, Pencil, Search, X } from 'lucide-react'

// ---------- Types ----------
type EmissionFactor = {
  id: string
  name: string
  category: string
  unit: string
  co2PerUnit: number
  source: string | null
  country: string | null
  effectiveDate: string | null
  status: string
}

type FormValues = {
  name: string
  category: 'FUEL' | 'ELECTRICITY' | 'MATERIAL' | 'TRANSPORT'
  unit: string
  co2PerUnit: number
  source: string
  country: string
  effectiveDate: string
  status: 'ACTIVE' | 'INACTIVE'
}

// ---------- Design tokens ----------
const CATEGORY_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  FUEL:        { label: 'Fuel',        bg: 'bg-orange-50', text: 'text-orange-700' },
  ELECTRICITY: { label: 'Electricity', bg: 'bg-yellow-50', text: 'text-yellow-700' },
  MATERIAL:    { label: 'Material',    bg: 'bg-blue-50',   text: 'text-blue-700'   },
  TRANSPORT:   { label: 'Transport',   bg: 'bg-violet-50', text: 'text-violet-700' },
}

function CategoryPill({ category }: { category: string }) {
  const c = CATEGORY_CONFIG[category] ?? { label: category, bg: 'bg-gray-50', text: 'text-gray-600' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const s = status === 'ACTIVE'
    ? { bg: 'bg-emerald-50', text: 'text-emerald-700' }
    : { bg: 'bg-gray-100',   text: 'text-gray-500'   }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
      {status === 'ACTIVE' ? 'Active' : 'Inactive'}
    </span>
  )
}

// ---------- Main page ----------
export default function EmissionFactorsPage() {
  const qc = useQueryClient()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selected, setSelected] = useState<EmissionFactor | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<EmissionFactor | null>(null)
  const [search, setSearch] = useState('')

  const { data: factors = [], isLoading } = useQuery<EmissionFactor[]>({
    queryKey: ['emission-factors'],
    queryFn: () => fetch('/api/emission-factors').then(r => r.json()),
  })

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return factors
    return factors.filter(f =>
      f.name.toLowerCase().includes(q) ||
      f.category.toLowerCase().includes(q) ||
      (f.source ?? '').toLowerCase().includes(q)
    )
  }, [factors, search])

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    defaultValues: { name: '', category: 'FUEL', unit: '', co2PerUnit: 0, source: '', country: '', effectiveDate: '', status: 'ACTIVE' },
  })

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = { ...values, co2PerUnit: Number(values.co2PerUnit), source: values.source || undefined, country: values.country || undefined, effectiveDate: values.effectiveDate || undefined }
      const url = selected ? `/api/emission-factors/${selected.id}` : '/api/emission-factors'
      const method = selected ? 'PATCH' : 'POST'
      return fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(r => r.json())
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['emission-factors'] }); closeDrawer() },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/emission-factors/${id}`, { method: 'DELETE' }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['emission-factors'] }); setDeleteTarget(null) },
  })

  const openCreate = () => { setSelected(null); reset({ name: '', category: 'FUEL', unit: '', co2PerUnit: 0, source: '', country: '', effectiveDate: '', status: 'ACTIVE' }); setDrawerOpen(true) }
  const openEdit = (item: EmissionFactor) => {
    setSelected(item)
    reset({ name: item.name, category: item.category as any, unit: item.unit, co2PerUnit: item.co2PerUnit, source: item.source ?? '', country: item.country ?? '', effectiveDate: item.effectiveDate ? new Date(item.effectiveDate).toISOString().split('T')[0] : '', status: item.status as any })
    setDrawerOpen(true)
  }
  const closeDrawer = () => { setDrawerOpen(false); setSelected(null) }

  return (
    <div className="min-h-full bg-[#F7F6F1]">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Emission Factors</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isLoading ? '…' : `${factors.length} records`} · CO₂ equivalents per emission unit
          </p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4F7A5A] text-white text-sm font-medium hover:bg-[#3d6147] transition-colors">
          <Plus className="w-4 h-4" />
          New Factor
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg flex-1 max-w-xs shadow-sm">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Search factor, category or source…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 text-sm bg-transparent outline-none placeholder:text-gray-400"
          />
          {search && <button onClick={() => setSearch('')}><X className="w-3.5 h-3.5 text-gray-400" /></button>}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">Name</th>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">Category</th>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">Unit</th>
              <th className="text-right text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">CO₂/Unit (kg)</th>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">Source</th>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">Status</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>
                  {[...Array(7)].map((_, j) => (
                    <td key={j} className="px-5 py-3.5">
                      <div className="h-4 bg-gray-100 rounded animate-pulse w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <span className="text-4xl">🌱</span>
                    <p className="text-sm font-medium text-gray-500">No emission factors found</p>
                    <p className="text-xs">Add your first factor to get started</p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map(factor => (
                <tr
                  key={factor.id}
                  onClick={() => openEdit(factor)}
                  className="hover:bg-[#F7F6F1] cursor-pointer transition-colors group"
                >
                  <td className="px-5 py-3.5 font-medium text-gray-900">{factor.name}</td>
                  <td className="px-5 py-3.5"><CategoryPill category={factor.category} /></td>
                  <td className="px-5 py-3.5 text-gray-600 font-mono text-xs">{factor.unit}</td>
                  <td className="px-5 py-3.5 text-right font-semibold text-gray-900 font-mono">{Number(factor.co2PerUnit).toFixed(4)}</td>
                  <td className="px-5 py-3.5 text-gray-500 text-xs">{factor.source ?? <span className="text-gray-300">—</span>}</td>
                  <td className="px-5 py-3.5"><StatusBadge status={factor.status} /></td>
                  <td className="px-5 py-3.5">
                    <button
                      onClick={e => { e.stopPropagation(); setDeleteTarget(factor) }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={closeDrawer} />
          <div className="w-[460px] bg-white shadow-2xl flex flex-col h-full">
            {/* Drawer header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div>
                <h2 className="text-base font-semibold text-gray-900">{selected ? 'Edit Emission Factor' : 'New Emission Factor'}</h2>
                {selected && <p className="text-xs text-gray-400 mt-0.5">{selected.name}</p>}
              </div>
              <button onClick={closeDrawer} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer body */}
            <form onSubmit={handleSubmit(v => saveMutation.mutate(v))} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Name <span className="text-red-500">*</span></label>
                <input
                  {...register('name', { required: 'Name is required' })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#4F7A5A] focus:ring-2 focus:ring-[#4F7A5A]/15 transition"
                  placeholder="e.g. Diesel combustion"
                />
                {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
              </div>

              {/* Category + Status */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Category <span className="text-red-500">*</span></label>
                  <select {...register('category')} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#4F7A5A] focus:ring-2 focus:ring-[#4F7A5A]/15 bg-white transition">
                    <option value="FUEL">Fuel</option>
                    <option value="ELECTRICITY">Electricity</option>
                    <option value="MATERIAL">Material</option>
                    <option value="TRANSPORT">Transport</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <select {...register('status')} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#4F7A5A] focus:ring-2 focus:ring-[#4F7A5A]/15 bg-white transition">
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Unit + CO2 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Unit <span className="text-red-500">*</span></label>
                  <input {...register('unit', { required: 'Unit required' })} placeholder="e.g. L, kWh, kg, km"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#4F7A5A] focus:ring-2 focus:ring-[#4F7A5A]/15 transition" />
                  {errors.unit && <p className="text-xs text-red-500">{errors.unit.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">kg CO₂e / Unit <span className="text-red-500">*</span></label>
                  <input type="number" step="0.0001" {...register('co2PerUnit', { required: true, valueAsNumber: true, validate: v => v > 0 || 'Must be > 0' })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#4F7A5A] focus:ring-2 focus:ring-[#4F7A5A]/15 font-mono transition" />
                  {errors.co2PerUnit && <p className="text-xs text-red-500">{errors.co2PerUnit.message}</p>}
                </div>
              </div>

              {/* Source */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Source</label>
                <input {...register('source')} placeholder="e.g. DEFRA 2024, EPA"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#4F7A5A] focus:ring-2 focus:ring-[#4F7A5A]/15 transition" />
              </div>

              {/* Country + Date */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Country</label>
                  <input {...register('country')} placeholder="e.g. IN, UK, US"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#4F7A5A] focus:ring-2 focus:ring-[#4F7A5A]/15 transition" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Effective Date</label>
                  <input type="date" {...register('effectiveDate')}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#4F7A5A] focus:ring-2 focus:ring-[#4F7A5A]/15 transition" />
                </div>
              </div>
            </form>

            {/* Drawer footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
              <button type="button" onClick={closeDrawer} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                Discard
              </button>
              <button
                onClick={handleSubmit(v => saveMutation.mutate(v))}
                disabled={saveMutation.isPending}
                className="px-5 py-2 text-sm font-medium text-white bg-[#4F7A5A] rounded-lg hover:bg-[#3d6147] disabled:opacity-60 transition-colors"
              >
                {saveMutation.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <div className="flex items-start gap-4">
              <div className="p-2.5 bg-red-50 rounded-xl shrink-0">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Delete Emission Factor</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Delete <span className="font-medium text-gray-700">&ldquo;{deleteTarget.name}&rdquo;</span>? This cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
              <button
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-60"
              >
                {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
