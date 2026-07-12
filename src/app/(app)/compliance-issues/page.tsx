'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable, type Column } from '@/components/shared/data-table'
import { RecordDrawer } from '@/components/shared/record-drawer'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { StatusPill } from '@/components/shared/status-pill'
import { SeverityPill } from '@/components/shared/severity-pill'
import { Button } from '@/components/ui/button'
import { Input, Textarea, Select } from '@/components/shared/form-controls'
import { FormField } from '@/components/shared/form-field'
import { useToast } from '@/components/shared/toast'
import { useCurrentUser, useOptions } from '@/lib/hooks'
import { can } from '@/lib/roles'
import { apiGet, apiPost, apiPatch, apiDelete, ApiError } from '@/lib/api'
import { formatDate, relativeDays } from '@/lib/utils'
import type { ComplianceIssueView } from '@/server/services/governance/compliance'

interface FormState {
  id?: string
  auditId: string
  description: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  departmentId: string
  ownerId: string
  dueDate: string
  status: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED'
}
const EMPTY: FormState = {
  auditId: '',
  description: '',
  severity: 'MEDIUM',
  departmentId: '',
  ownerId: '',
  dueDate: '',
  status: 'OPEN',
}

export default function ComplianceIssuesPage() {
  const { role } = useCurrentUser()
  const { toast } = useToast()
  const qc = useQueryClient()
  const options = useOptions()

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const canManage = can.manageCompliance(role)
  const canResolve = can.resolveCompliance(role)
  const canDelete = can.remove(role)

  const { data: issues = [], isLoading } = useQuery<ComplianceIssueView[]>({
    queryKey: ['compliance-issues'],
    queryFn: () => apiGet<ComplianceIssueView[]>('/api/compliance-issues'),
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['compliance-issues'] })
    qc.invalidateQueries({ queryKey: ['dashboard'] })
    qc.invalidateQueries({ queryKey: ['scoreboard'] })
    qc.invalidateQueries({ queryKey: ['notifications'] })
  }

  const resolveMutation = useMutation({
    mutationFn: (id: string) => apiPost(`/api/compliance-issues/${id}/resolve`),
    onMutate: (id) => setBusyId(id),
    onSuccess: () => {
      toast({ title: 'Issue resolved', description: 'Closure rate up — Governance score recalculated.' })
      invalidate()
    },
    onError: (e: ApiError) =>
      toast({ title: 'Could not resolve', description: e.message, variant: 'error' }),
    onSettled: () => setBusyId(null),
  })

  const openCreate = () => {
    setForm(EMPTY)
    setDrawerOpen(true)
  }
  const openEdit = (i: ComplianceIssueView) => {
    if (!canManage) return
    setForm({
      id: i.id,
      auditId: i.auditId ?? '',
      description: i.description,
      severity: i.severity as FormState['severity'],
      departmentId: i.departmentId ?? '',
      ownerId: i.ownerId,
      dueDate: i.dueDate ? new Date(i.dueDate).toISOString().slice(0, 10) : '',
      status: i.status as FormState['status'],
    })
    setDrawerOpen(true)
  }

  const save = async () => {
    // Owner + due date are mandatory business rules.
    if (form.description.trim().length < 3) {
      toast({ title: 'Description is required', variant: 'error' })
      return
    }
    if (!form.ownerId) {
      toast({ title: 'An owner is required', variant: 'error' })
      return
    }
    if (!form.dueDate) {
      toast({ title: 'A due date is required', variant: 'error' })
      return
    }
    setSaving(true)
    try {
      const payload = {
        auditId: form.auditId || undefined,
        description: form.description,
        severity: form.severity,
        departmentId: form.departmentId || undefined,
        ownerId: form.ownerId,
        dueDate: form.dueDate,
        status: form.status,
      }
      if (form.id) await apiPatch(`/api/compliance-issues/${form.id}`, payload)
      else await apiPost('/api/compliance-issues', payload)
      toast({ title: form.id ? 'Issue updated' : 'Issue raised' })
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
      await apiDelete(`/api/compliance-issues/${deleteId}`)
      toast({ title: 'Issue deleted' })
      invalidate()
    } catch (e) {
      toast({ title: 'Delete failed', description: (e as ApiError).message, variant: 'error' })
    } finally {
      setDeleteId(null)
    }
  }

  const columns: Column<ComplianceIssueView>[] = [
    {
      key: 'description',
      label: 'Issue',
      render: (v, r) => (
        <div className="flex items-start gap-2">
          {r.overdue && (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" aria-label="Overdue" />
          )}
          <div>
            <div className="font-medium text-brand-text">{v as string}</div>
            {r.auditTitle && <div className="text-xs text-brand-muted">from {r.auditTitle}</div>}
          </div>
        </div>
      ),
    },
    { key: 'severity', label: 'Severity', render: (v) => <SeverityPill severity={v as string} /> },
    { key: 'departmentName', label: 'Department', render: (v) => (v as string) ?? '—' },
    { key: 'ownerName', label: 'Owner', render: (v) => (v as string) ?? '—' },
    {
      key: 'dueDate',
      label: 'Due',
      sortable: true,
      render: (v, r) => (
        <span className={r.overdue ? 'font-medium text-red-600' : 'text-brand-text'}>
          {formatDate(v as Date)}
          {r.overdue && <span className="ml-1 text-xs">({relativeDays(v as Date).label})</span>}
        </span>
      ),
    },
    { key: 'status', label: 'Status', render: (v) => <StatusPill status={v as string} /> },
    {
      key: 'id',
      label: '',
      render: (_v, r) => (
        <div className="flex items-center justify-end gap-1">
          {canResolve && r.status !== 'RESOLVED' && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                resolveMutation.mutate(r.id)
              }}
              disabled={busyId === r.id}
              className="inline-flex items-center gap-1 rounded-md bg-brand-primary/10 px-2 py-1 text-xs font-semibold text-brand-primary-dark hover:bg-brand-primary/20 disabled:opacity-50"
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Resolve
            </button>
          )}
          {canDelete && (
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
          )}
        </div>
      ),
    },
  ]

  const overdueCount = issues.filter((i) => i.overdue).length

  return (
    <div>
      <PageHeader
        title="Compliance Issues"
        subtitle="Every issue has an owner and a due date. Overdue open issues are flagged."
      >
        {canManage && (
          <Button onClick={openCreate}>
            <Plus className="mr-1 h-4 w-4" /> New Issue
          </Button>
        )}
      </PageHeader>

      {overdueCount > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            <strong>{overdueCount}</strong> open issue{overdueCount > 1 ? 's are' : ' is'} past
            due — owner{overdueCount > 1 ? 's have' : ' has'} been notified.
          </span>
        </div>
      )}

      <div className="rounded-xl border border-black/5 bg-white p-4">
        <DataTable columns={columns} data={issues} loading={isLoading} onRowClick={openEdit} />
      </div>

      <RecordDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title={form.id ? 'Edit Compliance Issue' : 'New Compliance Issue'}
        onSave={save}
        onDiscard={() => setDrawerOpen(false)}
        loading={saving}
      >
        <div className="space-y-4">
          <FormField label="Description" required>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="What needs to be fixed?"
            />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Severity">
              <Select
                value={form.severity}
                onChange={(e) =>
                  setForm({ ...form, severity: e.target.value as FormState['severity'] })
                }
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </Select>
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
          <FormField label="Owner" required>
            <Select
              value={form.ownerId}
              onChange={(e) => setForm({ ...form, ownerId: e.target.value })}
            >
              <option value="">— Select owner —</option>
              {(options.data?.users ?? []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role.replace('_', ' ').toLowerCase()})
                </option>
              ))}
            </Select>
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Due Date" required>
              <Input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
            </FormField>
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
          </div>
          <FormField label="Linked Audit">
            <Select
              value={form.auditId}
              onChange={(e) => setForm({ ...form, auditId: e.target.value })}
            >
              <option value="">— None —</option>
              {(options.data?.audits ?? []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
      </RecordDrawer>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete this issue?"
        description="This permanently removes the compliance issue. This cannot be undone."
        action="Delete"
        variant="destructive"
        onConfirm={remove}
      />
    </div>
  )
}
