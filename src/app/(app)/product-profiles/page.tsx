'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Plus, Trash2, Search, X, CheckCircle2, XCircle } from 'lucide-react'

type EmissionFactor = { id: string; name: string; unit: string; status: string }
type ProductProfile = {
  id: string
  product: string
  emissionFactorId: string | null
  emissionFactorName: string | null
  recyclable: boolean
  hazardous: boolean
  greenAlternative: string | null
  carbonCategory: string | null
}
type FormValues = {
  product: string
  emissionFactorId: string
  carbonCategory: string
  greenAlternative: string
  recyclable: boolean
  hazardous: boolean
}

function BoolIcon({ value }: { value: boolean }) {
  return value
    ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
    : <XCircle className="w-4 h-4 text-gray-200" />
}

function CarbonCategoryPill({ cat }: { cat: string | null }) {
  if (!cat) return <span className="text-gray-300 text-xs">—</span>
  const map: Record<string, { bg: string; text: string }> = {
    FUEL:        { bg: 'bg-orange-50', text: 'text-orange-700' },
    ELECTRICITY: { bg: 'bg-yellow-50', text: 'text-yellow-700' },
    MATERIAL:    { bg: 'bg-blue-50',   text: 'text-blue-700'   },
    TRANSPORT:   { bg: 'bg-violet-50', text: 'text-violet-700' },
  }
  const c = map[cat] ?? { bg: 'bg-gray-100', text: 'text-gray-600' }
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>{cat}</span>
}

export default function ProductProfilesPage() {
  const qc = useQueryClient()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selected, setSelected] = useState<ProductProfile | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ProductProfile | null>(null)
  const [search, setSearch] = useState('')

  const { data: profiles = [], isLoading } = useQuery<ProductProfile[]>({
    queryKey: ['product-profiles'],
    queryFn: () => fetch('/api/product-profiles').then(r => r.json()),
  })

  const { data: factors = [] } = useQuery<EmissionFactor[]>({
    queryKey: ['emission-factors'],
    queryFn: () => fetch('/api/emission-factors').then(r => r.json()),
  })

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return q ? profiles.filter(p => p.product.toLowerCase().includes(q) || (p.emissionFactorName ?? '').toLowerCase().includes(q)) : profiles
  }, [profiles, search])

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    defaultValues: { product: '', emissionFactorId: '', carbonCategory: '', greenAlternative: '', recyclable: false, hazardous: false },
  })

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = { ...values, emissionFactorId: values.emissionFactorId || null, carbonCategory: values.carbonCategory || null, greenAlternative: values.greenAlternative || null, recyclable: Boolean(values.recyclable), hazardous: Boolean(values.hazardous) }
      const url = selected ? `/api/product-profiles/${selected.id}` : '/api/product-profiles'
      return fetch(url, { method: selected ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(r => r.json())
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['product-profiles'] }); closeDrawer() },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/product-profiles/${id}`, { method: 'DELETE' }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['product-profiles'] }); setDeleteTarget(null) },
  })

  const openCreate = () => { setSelected(null); reset({ product: '', emissionFactorId: '', carbonCategory: '', greenAlternative: '', recyclable: false, hazardous: false }); setDrawerOpen(true) }
  const openEdit = (item: ProductProfile) => {
    setSelected(item)
    reset({ product: item.product, emissionFactorId: item.emissionFactorId ?? '', carbonCategory: item.carbonCategory ?? '', greenAlternative: item.greenAlternative ?? '', recyclable: item.recyclable, hazardous: item.hazardous })
    setDrawerOpen(true)
  }
  const closeDrawer = () => { setDrawerOpen(false); setSelected(null) }

  return (
    <div className="min-h-full bg-[#F7F6F1]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Product ESG Profiles</h1>
          <p className="text-sm text-gray-500 mt-0.5">{isLoading ? '…' : `${profiles.length} profiles`} · Recyclability, hazard status and emission factors per product</p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4F7A5A] text-white text-sm font-medium hover:bg-[#3d6147] transition-colors">
          <Plus className="w-4 h-4" />New Profile
        </button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg flex-1 max-w-xs shadow-sm">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input type="text" placeholder="Search product or emission factor…" value={search} onChange={e => setSearch(e.target.value)} className="flex-1 text-sm bg-transparent outline-none placeholder:text-gray-400" />
          {search && <button onClick={() => setSearch('')}><X className="w-3.5 h-3.5 text-gray-400" /></button>}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">Product</th>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">Emission Factor</th>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">Category</th>
              <th className="text-center text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">Recyclable</th>
              <th className="text-center text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">Hazardous</th>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">Green Alternative</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? [...Array(5)].map((_, i) => (
              <tr key={i}>{[...Array(7)].map((_, j) => <td key={j} className="px-5 py-3.5"><div className="h-4 bg-gray-100 rounded animate-pulse w-3/4" /></td>)}</tr>
            )) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-16 text-center">
                <div className="flex flex-col items-center gap-2">
                  <span className="text-4xl">📦</span>
                  <p className="text-sm font-medium text-gray-500">No product profiles found</p>
                </div>
              </td></tr>
            ) : filtered.map(p => (
              <tr key={p.id} onClick={() => openEdit(p)} className="hover:bg-[#F7F6F1] cursor-pointer transition-colors group">
                <td className="px-5 py-3.5 font-medium text-gray-900">{p.product}</td>
                <td className="px-5 py-3.5 text-gray-600 text-xs">{p.emissionFactorName ?? <span className="text-gray-300">—</span>}</td>
                <td className="px-5 py-3.5"><CarbonCategoryPill cat={p.carbonCategory} /></td>
                <td className="px-5 py-3.5 text-center"><BoolIcon value={p.recyclable} /></td>
                <td className="px-5 py-3.5 text-center"><BoolIcon value={p.hazardous} /></td>
                <td className="px-5 py-3.5 text-gray-500 text-xs">{p.greenAlternative ?? <span className="text-gray-300">—</span>}</td>
                <td className="px-5 py-3.5">
                  <button onClick={e => { e.stopPropagation(); setDeleteTarget(p) }} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all">
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
          <div className="w-[460px] bg-white shadow-2xl flex flex-col h-full">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div>
                <h2 className="text-base font-semibold text-gray-900">{selected ? 'Edit Product ESG Profile' : 'New Product ESG Profile'}</h2>
                {selected && <p className="text-xs text-gray-400 mt-0.5">{selected.product}</p>}
              </div>
              <button onClick={closeDrawer} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400"><X className="w-5 h-5" /></button>
            </div>

            <form className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Product Name <span className="text-red-500">*</span></label>
                <input {...register('product', { required: 'Product name is required' })} placeholder="e.g. Diesel vehicle, Server rack"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#4F7A5A] focus:ring-2 focus:ring-[#4F7A5A]/15 transition" />
                {errors.product && <p className="text-xs text-red-500">{errors.product.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Emission Factor</label>
                <select {...register('emissionFactorId')} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#4F7A5A] focus:ring-2 focus:ring-[#4F7A5A]/15 bg-white transition">
                  <option value="">— None —</option>
                  {factors.filter(f => f.status === 'ACTIVE').map(f => <option key={f.id} value={f.id}>{f.name} ({f.unit})</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Carbon Category</label>
                <select {...register('carbonCategory')} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#4F7A5A] focus:ring-2 focus:ring-[#4F7A5A]/15 bg-white transition">
                  <option value="">— None —</option>
                  <option value="FUEL">Fuel</option>
                  <option value="ELECTRICITY">Electricity</option>
                  <option value="MATERIAL">Material</option>
                  <option value="TRANSPORT">Transport</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Green Alternative</label>
                <input {...register('greenAlternative')} placeholder="e.g. EV equivalent, Solar-powered"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#4F7A5A] focus:ring-2 focus:ring-[#4F7A5A]/15 transition" />
              </div>

              {/* Toggle flags */}
              <div className="space-y-3 pt-1">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Attributes</p>
                <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors">
                  <input type="checkbox" {...register('recyclable')} className="w-4 h-4 rounded border-gray-300 text-[#4F7A5A] focus:ring-[#4F7A5A] accent-[#4F7A5A]" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Recyclable</p>
                    <p className="text-xs text-gray-400">Product materials can be recycled at end of life</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors">
                  <input type="checkbox" {...register('hazardous')} className="w-4 h-4 rounded border-gray-300 text-[#4F7A5A] focus:ring-[#4F7A5A] accent-[#4F7A5A]" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Hazardous</p>
                    <p className="text-xs text-gray-400">Contains hazardous materials requiring special disposal</p>
                  </div>
                </label>
              </div>
            </form>

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
                <h3 className="font-semibold text-gray-900">Delete Product ESG Profile</h3>
                <p className="text-sm text-gray-500 mt-1">Delete <span className="font-medium text-gray-700">&ldquo;{deleteTarget.product}&rdquo;</span>? This cannot be undone.</p>
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
