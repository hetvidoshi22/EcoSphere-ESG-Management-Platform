'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable, type Column } from '@/components/shared/data-table'
import { RecordDrawer } from '@/components/shared/record-drawer'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { StatusPill } from '@/components/shared/status-pill'
import { Button } from '@/components/ui/button'
import { Input, Textarea, Select } from '@/components/shared/form-controls'
import { FormField } from '@/components/shared/form-field'
import { useToast } from '@/components/shared/toast'
import { useCurrentUser, useOptions } from '@/lib/hooks'
import { can } from '@/lib/roles'
import { apiGet, apiPost, apiPatch, apiDelete, ApiError } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import type { AuditView } from '@/server/services/governance/audits'

interface FormState {
  id?: string
  title: string
  departmentId: string
  auditorId: string
  date: string
  findings: string
  status: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED'
}
const EMPTY: FormState = {
  title: '',
  departmentId: '',
  auditorId: '',
  date: '',
  findings: '',
  status: 'OPEN',
}

export default function AuditsPage() {
  const { role } = useCurrentUser()
  const { toast } = useToast()
  const qc = useQueryClient()
  const options = useOptions()

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const canManage = can.manageAudit(role)

  const { data: audits = [], isLoading } = useQuery<AuditView[]>({
    queryKey: ['audits'],
    queryFn: () => apiGet<AuditView[]>('/api/audits'),
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['audits'] })

  const openCreate = () => {
    setForm(EMPTY)
    setDrawerOpen(true)
  }
  const openEdit = (a: AuditView) => {
    if (!canManage) return
    setForm({
      id: a.id,
      title: a.title,
      departmentId: a.departmentId ?? '',
      auditorId: a.auditorId ?? '',
      date: a.date ? new Date(a.date).toISOString().slice(0, 10) : '',
      findings: a.findings ?? '',
      status: a.status as FormState['status'],
    })
    setDrawerOpen(true)
  }

  const save = async () => {
    if (form.title.trim().length < 2) {
      toast({ title: 'Title is required', variant: 'error' })
      return
    }
    setSaving(true)
    try {
      const payload = {
        title: form.title,
        departmentId: form.departmentId || undefined,
        auditorId: form.auditorId || undefined,
        date: form.date || undefined,
        findings: form.findings || undefined,
        status: form.status,
      }
      if (form.id) await apiPatch(`/api/audits/${form.id}`, payload)
      else await apiPost('/api/audits', payload)
      toast({ title: form.id ? 'Audit updated' : 'Audit created' })
      setDrawerOpen(false)
      invalidate()
    } catch (e) {
      toast({ title: 'Save failed', description: (e as ApiError).message, variant: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!deleteId) return
    try {
      await apiDelete(`/api/audits/${deleteId}`)
      toast({ title: 'Audit deleted' })
      invalidate()
    } catch (e) {
      toast({ title: 'Delete failed', description: (e as ApiError).message, variant: 'error' })
    } finally {
      setDeleteId(null)
    }
  }

  const columns: Column<AuditView>[] = [
    { key: 'title', label: 'Audit', sortable: true, render: (v) => <span className="font-medium text-brand-text">{v as string}</span> },
    { key: 'departmentName', label: 'Department', render: (v) => (v as string) ?? '—' },
    { key: 'auditorName', label: 'Auditor', render: (v) => (v as string) ?? '—' },
    { key: 'date', label: 'Date', sortable: true, render: (v) => formatDate(v as Date) },
    {
      key: 'issueCount',
      label: 'Issues',
      render: (v) => <span className="font-medium">{v as number}</span>,
    },
    { key: 'status', label: 'Status', render: (v) => <StatusPill status={v as string} /> },
    {
      key: 'id',
      label: '',
      render: (_v, r) =>
        canManage ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setDeleteId(r.id)
            }}
            className="rounded-md p-1.5 text-brand-muted hover:bg-red-50 hover:text-red-600"
            aria-label="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        ) : null,
    },
  ]

  return (
    <div>
      <PageHeader
        title="Audits"
        subtitle="Governance audits and their findings. Raise compliance issues from an audit."
      >
        {canManage && (
          <Button onClick={openCreate}>
            <Plus className="mr-1 h-4 w-4" /> New Audit
          </Button>
        )}
      </PageHeader>

      <div className="rounded-xl border border-black/5 bg-white p-4">
        <DataTable columns={columns} data={audits} loading={isLoading} onRowClick={openEdit} />
      </div>

      <RecordDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title={form.id ? 'Edit Audit' : 'New Audit'}
        onSave={save}
        onDiscard={() => setDrawerOpen(false)}
        loading={saving}
      >
        <div className="space-y-4">
          <FormField label="Title" required>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Q2 Waste Audit"
            />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Department">
              <Select
                value={form.departmentId}
                onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
              >
                <option value="">—</option>
                {(options.data?.departments ?? []).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Auditor">
              <Select
                value={form.auditorId}
                onChange={(e) => setForm({ ...form, auditorId: e.target.value })}
              >
                <option value="">—</option>
                {(options.data?.users ?? [])
                  .filter((u) => u.role === 'AUDITOR' || u.role === 'ADMIN')
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
              </Select>
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Date">
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </FormField>
            <FormField label="Status">
              <Select
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as FormState['status'] })
                }
              >
                <option value="OPEN">Open</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="RESOLVED">Resolved</option>
              </Select>
            </FormField>
          </div>
          <FormField label="Findings">
            <Textarea
              value={form.findings}
              onChange={(e) => setForm({ ...form, findings: e.target.value })}
              placeholder="Summary of audit findings"
            />
          </FormField>
        </div>
      </RecordDrawer>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete this audit?"
        description="Related compliance issues will be detached, not deleted."
        action="Delete"
        variant="destructive"
        onConfirm={remove}
      />
    </div>
  )
}
