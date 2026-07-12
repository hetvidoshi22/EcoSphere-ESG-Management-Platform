'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { DataTable, type Column } from '@/components/shared/data-table'
import { RecordDrawer } from '@/components/shared/record-drawer'
import { FormField } from '@/components/shared/form-field'
import { StatusPill } from '@/components/shared/status-pill'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'

interface Department {
  id: string
  name: string
  code: string
  headId: string | null
  headName: string | null
  parentId: string | null
  employeeCount: number
  status: 'ACTIVE' | 'INACTIVE'
}

interface UserLite {
  id: string
  name: string
  role: string
}

const inputCls =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-brand-primary'

async function getDepartments(): Promise<Department[]> {
  const res = await fetch('/api/departments')
  if (!res.ok) throw new Error('Failed to load departments')
  return (await res.json()).departments
}

async function getUsers(): Promise<UserLite[]> {
  const res = await fetch('/api/users')
  if (!res.ok) throw new Error('Failed to load users')
  return (await res.json()).users
}

type FormState = {
  name: string
  code: string
  headId: string
  parentId: string
  status: 'ACTIVE' | 'INACTIVE'
}

const emptyForm: FormState = { name: '', code: '', headId: '', parentId: '', status: 'ACTIVE' }

export default function DepartmentsPage() {
  const { data: session } = useSession()
  const isAdmin = (session?.user as any)?.role === 'ADMIN'
  const qc = useQueryClient()

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<Department | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Department | null>(null)

  const { data: departments = [], isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: getDepartments,
  })
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: getUsers })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['departments'] })

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        code: form.code,
        headId: form.headId || null,
        parentId: form.parentId || null,
        status: form.status,
      }
      const url = editing ? `/api/departments/${editing.id}` : '/api/departments'
      const res = await fetch(url, {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || (res.status === 422 ? 'Validation failed' : 'Save failed'))
      }
      return res.json()
    },
    onSuccess: () => {
      invalidate()
      closeDrawer()
    },
    onError: (e: Error) => setError(e.message),
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/departments/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
    },
    onSuccess: () => {
      invalidate()
      setConfirmDelete(null)
    },
  })

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setError(null)
    setDrawerOpen(true)
  }

  function openEdit(d: Department) {
    setEditing(d)
    setForm({
      name: d.name,
      code: d.code,
      headId: d.headId ?? '',
      parentId: d.parentId ?? '',
      status: d.status,
    })
    setError(null)
    setDrawerOpen(true)
  }

  function closeDrawer() {
    setDrawerOpen(false)
    setEditing(null)
    setError(null)
  }

  const columns: Column<Department>[] = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'code', label: 'Code', sortable: true },
    { key: 'headName', label: 'Head', render: (v) => v || <span className="text-gray-400">—</span> },
    { key: 'employeeCount', label: 'Employees', sortable: true },
    { key: 'status', label: 'Status', render: (v) => <StatusPill status={v} /> },
    ...(isAdmin
      ? [
          {
            key: 'id' as keyof Department,
            label: '',
            width: '48px',
            render: (_v: any, d: Department) => (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setConfirmDelete(d)
                }}
                className="text-gray-400 hover:text-red-600"
                aria-label={`Delete ${d.name}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            ),
          },
        ]
      : []),
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Departments</h1>
          <p className="text-sm text-gray-600 mt-1">Organisational units used across ESG scoring.</p>
        </div>
        {isAdmin && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:opacity-90"
          >
            <Plus className="w-4 h-4" /> New Department
          </button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={departments}
        loading={isLoading}
        onRowClick={isAdmin ? openEdit : undefined}
      />

      <RecordDrawer
        open={drawerOpen}
        onOpenChange={(o) => (o ? setDrawerOpen(true) : closeDrawer())}
        title={editing ? 'Edit Department' : 'New Department'}
        onSave={() => save.mutate()}
        onDiscard={closeDrawer}
        loading={save.isPending}
      >
        <div className="space-y-4">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          <FormField label="Name" required>
            <input
              className={inputCls}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Manufacturing"
            />
          </FormField>
          <FormField label="Code" required>
            <input
              className={inputCls}
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="e.g. MFG"
              maxLength={12}
            />
          </FormField>
          <FormField label="Head">
            <select
              className={inputCls}
              value={form.headId}
              onChange={(e) => setForm({ ...form, headId: e.target.value })}
            >
              <option value="">— None —</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Parent Department">
            <select
              className={inputCls}
              value={form.parentId}
              onChange={(e) => setForm({ ...form, parentId: e.target.value })}
            >
              <option value="">— None —</option>
              {departments
                .filter((d) => d.id !== editing?.id)
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
            </select>
          </FormField>
          <FormField label="Status">
            <select
              className={inputCls}
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as FormState['status'] })}
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </FormField>
        </div>
      </RecordDrawer>

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
        title="Delete department?"
        description={`This permanently removes "${confirmDelete?.name}". This cannot be undone.`}
        action="Delete"
        variant="destructive"
        loading={remove.isPending}
        onConfirm={() => {
          if (confirmDelete) remove.mutate(confirmDelete.id)
        }}
      />
    </div>
  )
}
