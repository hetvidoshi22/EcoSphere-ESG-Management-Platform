'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Plus, Trash2, Search, X } from 'lucide-react'

// ---------- Types ----------
type Department = { id: string; name: string }
type Goal = {
  id: string
  name: string
  departmentId: string
  departmentName: string | null
  targetCo2: number
  currentCo2: number
  deadline: string | null
  status: string
  createdAt: string
}

type FormValues = {
  name: string
  departmentId: string
  targetCo2: number
  deadline: string
  status: 'DRAFT' | 'ACTIVE' | 'ON_TRACK' | 'COMPLETED' | 'EXPIRED'
}

// ---------- Design Tokens ----------
const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  DRAFT:     { label: 'Draft',     bg: 'bg-gray-100',   text: 'text-gray-600'   },
  ACTIVE:    { label: 'Active',    bg: 'bg-blue-50',    text: 'text-blue-700'   },
  ON_TRACK:  { label: 'On Track',  bg: 'bg-emerald-50', text: 'text-emerald-700'},
  COMPLETED: { label: 'Completed', bg: 'bg-purple-50',  text: 'text-purple-700' },
  EXPIRED:   { label: 'Expired',   bg: 'bg-red-50',     text: 'text-red-700'    },
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_CONFIG[status] ?? { label: status, bg: 'bg-gray-100', text: 'text-gray-500' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  )
}

function ProgressBar({ current, target }: { current: number; target: number }) {
  const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0
  const color = pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-400' : 'bg-[#4F7A5A]'
  return (
    <div className="flex items-center gap-3 min-w-[140px]">
      <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
        <div className={`${color} h-1.5 rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 w-10 text-right font-medium">{pct.toFixed(0)}%</span>
    </div>
  )
}

export default function EnvironmentalGoalsPage() {
  const qc = useQueryClient()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selected, setSelected] = useState<Goal | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Goal | null>(null)
  const [search, setSearch] = useState('')

  const { data: goals = [], isLoading } = useQuery<Goal[]>({
    queryKey: ['goals'],
    queryFn: () => fetch('/api/goals').then(r => r.json()),
  })

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: () => fetch('/api/departments').then(r => r.json()),
  })

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return q ? goals.filter(g => g.name.toLowerCase().includes(q) || (g.departmentName ?? '').toLowerCase().includes(q)) : goals
  }, [goals, search])

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    defaultValues: { name: '', departmentId: '', targetCo2: 0, deadline: '', status: 'ACTIVE' },
  })

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = { ...values, targetCo2: Number(values.targetCo2), deadline: values.deadline || null }
      const url = selected ? `/api/goals/${selected.id}` : '/api/goals'
      return fetch(url, { method: selected ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(r => r.json())
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['goals'] }); closeDrawer() },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/goals/${id}`, { method: 'DELETE' }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['goals'] }); setDeleteTarget(null) },
  })

  const openCreate = () => { setSelected(null); reset({ name: '', departmentId: departments[0]?.id ?? '', targetCo2: 0, deadline: '', status: 'ACTIVE' }); setDrawerOpen(true) }
  const openEdit = (item: Goal) => {
    setSelected(item)
    reset({ name: item.name, departmentId: item.departmentId, targetCo2: item.targetCo2, deadline: item.deadline ? new Date(item.deadline).toISOString().split('T')[0] : '', status: item.status as FormValues['status'] })
    setDrawerOpen(true)
  }
  const closeDrawer = () => { setDrawerOpen(false); setSelected(null) }

  return (
    <div className="min-h-full bg-[#F7F6F1]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Environmental Goals</h1>
          <p className="text-sm text-gray-500 mt-0.5">{isLoading ? '…' : `${goals.length} goals`} · Set and track CO₂ reduction targets</p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4F7A5A] text-white text-sm font-medium hover:bg-[#3d6147] transition-colors">
          <Plus className="w-4 h-4" />New Goal
        </button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg flex-1 max-w-xs shadow-sm">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input type="text" placeholder="Search by name or department…" value={search} onChange={e => setSearch(e.target.value)} className="flex-1 text-sm bg-transparent outline-none placeholder:text-gray-400" />
          {search && <button onClick={() => setSearch('')}><X className="w-3.5 h-3.5 text-gray-400" /></button>}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">Goal Name</th>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">Department</th>
              <th className="text-right text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">Target (t CO₂e)</th>
              <th className="text-right text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">Current (t CO₂e)</th>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">Progress</th>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">Deadline</th>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">Status</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? [...Array(4)].map((_, i) => (
              <tr key={i}>{[...Array(8)].map((_, j) => <td key={j} className="px-5 py-3.5"><div className="h-4 bg-gray-100 rounded animate-pulse w-3/4" /></td>)}</tr>
            )) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-5 py-16 text-center">
                <div className="flex flex-col items-center gap-2">
                  <span className="text-4xl">🎯</span>
                  <p className="text-sm font-medium text-gray-500">No goals found</p>
                </div>
              </td></tr>
            ) : filtered.map(g => (
              <tr key={g.id} onClick={() => openEdit(g)} className="hover:bg-[#F7F6F1] cursor-pointer transition-colors group">
                <td className="px-5 py-3.5 font-medium text-gray-900">{g.name}</td>
                <td className="px-5 py-3.5 text-gray-600">{g.departmentName ?? <span className="text-gray-300">—</span>}</td>
                <td className="px-5 py-3.5 text-right font-mono text-gray-700">{Number(g.targetCo2).toFixed(1)}</td>
                <td className="px-5 py-3.5 text-right font-mono font-semibold text-gray-900">{Number(g.currentCo2).toFixed(1)}</td>
                <td className="px-5 py-3.5"><ProgressBar current={g.currentCo2} target={g.targetCo2} /></td>
                <td className="px-5 py-3.5 text-gray-500 text-xs">{g.deadline ? new Date(g.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : <span className="text-gray-300">—</span>}</td>
                <td className="px-5 py-3.5"><StatusBadge status={g.status} /></td>
                <td className="px-5 py-3.5">
                  <button onClick={e => { e.stopPropagation(); setDeleteTarget(g) }} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all">
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
                <h2 className="text-base font-semibold text-gray-900">{selected ? 'Edit Goal' : 'New Environmental Goal'}</h2>
                {selected && <p className="text-xs text-gray-400 mt-0.5">{selected.name}</p>}
              </div>
              <button onClick={closeDrawer} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {/* Progress Summary for existing */}
              {selected && (
                <div className="p-4 bg-[#F7F6F1] border border-[#4F7A5A]/20 rounded-xl space-y-3">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-xs font-semibold text-[#4F7A5A] uppercase tracking-wider">Current Progress</p>
                      <p className="text-xs text-gray-500 mt-0.5">Auto-synced from confirmed transactions</p>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{selected.currentCo2.toFixed(1)} <span className="text-sm font-normal text-gray-500">t</span></p>
                  </div>
                  <ProgressBar current={selected.currentCo2} target={selected.targetCo2} />
                </div>
              )}

              <form className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Goal Name <span className="text-red-500">*</span></label>
                  <input {...register('name', { required: 'Name is required' })} placeholder="e.g. FY26 Logistics Reduction"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#4F7A5A] focus:ring-2 focus:ring-[#4F7A5A]/15 transition" />
                  {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Department <span className="text-red-500">*</span></label>
                  <select {...register('departmentId', { required: 'Department is required' })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#4F7A5A] focus:ring-2 focus:ring-[#4F7A5A]/15 bg-white transition">
                    <option value="">— Select —</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                  {errors.departmentId && <p className="text-xs text-red-500">Required</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">Target (t CO₂e) <span className="text-red-500">*</span></label>
                    <input type="number" step="0.1" {...register('targetCo2', { required: true, valueAsNumber: true, validate: v => Number(v) > 0 || 'Must be > 0' })}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#4F7A5A] focus:ring-2 focus:ring-[#4F7A5A]/15 font-mono transition" />
                    {errors.targetCo2 && <p className="text-xs text-red-500">Required</p>}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">Deadline</label>
                    <input type="date" {...register('deadline')} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#4F7A5A] focus:ring-2 focus:ring-[#4F7A5A]/15 transition" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <select {...register('status')} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#4F7A5A] focus:ring-2 focus:ring-[#4F7A5A]/15 bg-white transition">
                    <option value="DRAFT">Draft</option>
                    <option value="ACTIVE">Active</option>
                    <option value="ON_TRACK">On Track</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="EXPIRED">Expired</option>
                  </select>
                </div>
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
                <h3 className="font-semibold text-gray-900">Delete Goal</h3>
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
