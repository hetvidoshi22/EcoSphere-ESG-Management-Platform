'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Plus, Trash2, Search, X } from 'lucide-react'

type Category = {
  id: string
  name: string
  type: 'CSR_ACTIVITY' | 'CHALLENGE'
  status: 'ACTIVE' | 'INACTIVE'
}

type FormValues = { name: string; type: 'CSR_ACTIVITY' | 'CHALLENGE'; status: 'ACTIVE' | 'INACTIVE' }

const TYPE_CONFIG = {
  CSR_ACTIVITY: { label: 'CSR Activity', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  CHALLENGE:    { label: 'Challenge',    bg: 'bg-indigo-50',  text: 'text-indigo-700'  },
}

function TypePill({ type }: { type: string }) {
  const c = TYPE_CONFIG[type as keyof typeof TYPE_CONFIG] ?? { label: type, bg: 'bg-gray-50', text: 'text-gray-600' }
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>{c.label}</span>
}

function StatusBadge({ status }: { status: string }) {
  const s = status === 'ACTIVE' ? { bg: 'bg-emerald-50', text: 'text-emerald-700' } : { bg: 'bg-gray-100', text: 'text-gray-500' }
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>{status === 'ACTIVE' ? 'Active' : 'Inactive'}</span>
}

export default function CategoriesPage() {
  const qc = useQueryClient()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selected, setSelected] = useState<Category | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)
  const [search, setSearch] = useState('')

  const { data: categories = [], isLoading } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => fetch('/api/categories').then(r => r.json()),
  })

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return q ? categories.filter(c => c.name.toLowerCase().includes(q) || c.type.toLowerCase().includes(q)) : categories
  }, [categories, search])

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    defaultValues: { name: '', type: 'CSR_ACTIVITY', status: 'ACTIVE' },
  })

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const url = selected ? `/api/categories/${selected.id}` : '/api/categories'
      return fetch(url, { method: selected ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) }).then(r => r.json())
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); closeDrawer() },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/categories/${id}`, { method: 'DELETE' }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); setDeleteTarget(null) },
  })

  const openCreate = () => { setSelected(null); reset({ name: '', type: 'CSR_ACTIVITY', status: 'ACTIVE' }); setDrawerOpen(true) }
  const openEdit = (item: Category) => { setSelected(item); reset({ name: item.name, type: item.type, status: item.status }); setDrawerOpen(true) }
  const closeDrawer = () => { setDrawerOpen(false); setSelected(null) }

  return (
    <div className="min-h-full bg-[#F7F6F1]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Categories</h1>
          <p className="text-sm text-gray-500 mt-0.5">{isLoading ? '…' : `${categories.length} categories`} · CSR Activity and Challenge taxonomy</p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4F7A5A] text-white text-sm font-medium hover:bg-[#3d6147] transition-colors">
          <Plus className="w-4 h-4" />New Category
        </button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg flex-1 max-w-xs shadow-sm">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input type="text" placeholder="Search by name or type…" value={search} onChange={e => setSearch(e.target.value)} className="flex-1 text-sm bg-transparent outline-none placeholder:text-gray-400" />
          {search && <button onClick={() => setSearch('')}><X className="w-3.5 h-3.5 text-gray-400" /></button>}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">Name</th>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">Type</th>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">Status</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? [...Array(4)].map((_, i) => (
              <tr key={i}>{[...Array(4)].map((_, j) => <td key={j} className="px-5 py-3.5"><div className="h-4 bg-gray-100 rounded animate-pulse w-3/4" /></td>)}</tr>
            )) : filtered.length === 0 ? (
              <tr><td colSpan={4} className="px-5 py-16 text-center">
                <div className="flex flex-col items-center gap-2 text-gray-400">
                  <span className="text-4xl">🗂️</span>
                  <p className="text-sm font-medium text-gray-500">No categories found</p>
                </div>
              </td></tr>
            ) : filtered.map(cat => (
              <tr key={cat.id} onClick={() => openEdit(cat)} className="hover:bg-[#F7F6F1] cursor-pointer transition-colors group">
                <td className="px-5 py-3.5 font-medium text-gray-900">{cat.name}</td>
                <td className="px-5 py-3.5"><TypePill type={cat.type} /></td>
                <td className="px-5 py-3.5"><StatusBadge status={cat.status} /></td>
                <td className="px-5 py-3.5">
                  <button onClick={e => { e.stopPropagation(); setDeleteTarget(cat) }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all">
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
          <div className="w-[420px] bg-white shadow-2xl flex flex-col h-full">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">{selected ? 'Edit Category' : 'New Category'}</h2>
              <button onClick={closeDrawer} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit(v => saveMutation.mutate(v))} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Name <span className="text-red-500">*</span></label>
                <input {...register('name', { required: 'Name is required' })} placeholder="e.g. Community Service" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#4F7A5A] focus:ring-2 focus:ring-[#4F7A5A]/15 transition" />
                {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Type <span className="text-red-500">*</span></label>
                <select {...register('type')} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#4F7A5A] focus:ring-2 focus:ring-[#4F7A5A]/15 bg-white transition">
                  <option value="CSR_ACTIVITY">CSR Activity</option>
                  <option value="CHALLENGE">Challenge</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Status</label>
                <select {...register('status')} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#4F7A5A] focus:ring-2 focus:ring-[#4F7A5A]/15 bg-white transition">
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
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
                <h3 className="font-semibold text-gray-900">Delete Category</h3>
                <p className="text-sm text-gray-500 mt-1">Delete <span className="font-medium text-gray-700">&ldquo;{deleteTarget.name}&rdquo;</span>? This cannot be undone.</p>
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
