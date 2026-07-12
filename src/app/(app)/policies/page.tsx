'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, FileText, Pencil, Trash2, Check, ShieldCheck } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { RecordDrawer } from '@/components/shared/record-drawer'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { EmptyState } from '@/components/shared/empty-state'
import { StatusPill } from '@/components/shared/status-pill'
import { Button } from '@/components/ui/button'
import { Input, Textarea, Select, Checkbox } from '@/components/shared/form-controls'
import { FormField } from '@/components/shared/form-field'
import { useToast } from '@/components/shared/toast'
import { useCurrentUser, useOptions } from '@/lib/hooks'
import { can } from '@/lib/roles'
import { apiGet, apiPost, apiPatch, apiDelete, ApiError } from '@/lib/api'
import type { PolicyView } from '@/server/services/governance/policies'

interface FormState {
  id?: string
  title: string
  type: string
  departmentId: string
  description: string
  version: string
  effectiveDate: string
  mandatory: boolean
  status: 'ACTIVE' | 'INACTIVE'
}
const EMPTY: FormState = {
  title: '',
  type: '',
  departmentId: '',
  description: '',
  version: '1.0',
  effectiveDate: '',
  mandatory: true,
  status: 'ACTIVE',
}

export default function PoliciesPage() {
  const { role } = useCurrentUser()
  const { toast } = useToast()
  const qc = useQueryClient()
  const options = useOptions()

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const canManage = can.managePolicy(role)

  const { data: policies = [], isLoading } = useQuery<PolicyView[]>({
    queryKey: ['policies'],
    queryFn: () => apiGet<PolicyView[]>('/api/policies'),
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['policies'] })
    qc.invalidateQueries({ queryKey: ['acknowledgements'] })
    qc.invalidateQueries({ queryKey: ['dashboard'] })
    qc.invalidateQueries({ queryKey: ['scoreboard'] })
  }

  const ackMutation = useMutation({
    mutationFn: (policyId: string) => apiPost('/api/acknowledgements', { policyId }),
    onSuccess: () => {
      toast({ title: 'Policy acknowledged', description: 'Thanks — this feeds the Governance score.' })
      invalidate()
    },
    onError: (e: ApiError) =>
      toast({
        title: e.status === 409 ? 'Already acknowledged' : 'Could not acknowledge',
        description: e.message,
        variant: e.status === 409 ? 'info' : 'error',
      }),
  })

  const openCreate = () => {
    setForm(EMPTY)
    setDrawerOpen(true)
  }
  const openEdit = (p: PolicyView) => {
    setForm({
      id: p.id,
      title: p.title,
      type: p.type ?? '',
      departmentId: p.departmentId ?? '',
      description: p.description ?? '',
      version: p.version,
      effectiveDate: p.effectiveDate ? new Date(p.effectiveDate).toISOString().slice(0, 10) : '',
      mandatory: p.mandatory,
      status: p.status as 'ACTIVE' | 'INACTIVE',
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
        type: form.type || undefined,
        departmentId: form.departmentId || undefined,
        description: form.description || undefined,
        version: form.version || '1.0',
        effectiveDate: form.effectiveDate || undefined,
        mandatory: form.mandatory,
        status: form.status,
      }
      if (form.id) await apiPatch(`/api/policies/${form.id}`, payload)
      else await apiPost('/api/policies', payload)
      toast({ title: form.id ? 'Policy updated' : 'Policy created' })
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
      await apiDelete(`/api/policies/${deleteId}`)
      toast({ title: 'Policy deleted' })
      invalidate()
    } catch (e) {
      toast({ title: 'Delete failed', description: (e as ApiError).message, variant: 'error' })
    } finally {
      setDeleteId(null)
    }
  }

  return (
    <div>
      <PageHeader
        title="ESG Policies"
        subtitle="Governance policies employees acknowledge to stay compliant."
      >
        {canManage && (
          <Button onClick={openCreate}>
            <Plus className="mr-1 h-4 w-4" /> New Policy
          </Button>
        )}
      </PageHeader>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-black/5" />
          ))}
        </div>
      ) : policies.length === 0 ? (
        <EmptyState
          icon="📄"
          title="No policies yet"
          description="Publish a governance policy for employees to acknowledge."
          action={canManage ? { label: 'New Policy', onClick: openCreate } : undefined}
        />
      ) : (
        <div className="space-y-3">
          {policies.map((p) => (
            <div
              key={p.id}
              className="flex flex-col gap-4 rounded-xl border border-black/5 bg-white p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
                  <FileText className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-brand-text">{p.title}</h3>
                    {p.mandatory && (
                      <span className="rounded-full bg-brand-primary/10 px-2 py-0.5 text-[11px] font-medium text-brand-primary-dark">
                        Mandatory
                      </span>
                    )}
                    <StatusPill status={p.status} />
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-sm text-brand-muted">
                    {p.description || 'No description'}
                  </p>
                  <p className="mt-1 text-xs text-brand-muted">
                    {p.type || 'Policy'} · v{p.version} · {p.departmentName ?? 'Company-wide'} ·{' '}
                    <span className="font-medium text-brand-text">{p.ackCount}</span> acknowledgements
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {canManage && (
                  <>
                    <button
                      onClick={() => openEdit(p)}
                      className="rounded-md p-1.5 text-brand-muted hover:bg-brand-surface"
                      aria-label="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeleteId(p.id)}
                      className="rounded-md p-1.5 text-brand-muted hover:bg-red-50 hover:text-red-600"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
                {p.ackedByMe ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-brand-primary/10 px-3 py-1.5 text-sm font-medium text-brand-primary-dark">
                    <ShieldCheck className="h-4 w-4" /> Acknowledged
                  </span>
                ) : (
                  <Button
                    size="sm"
                    disabled={ackMutation.isPending}
                    onClick={() => ackMutation.mutate(p.id)}
                  >
                    <Check className="mr-1 h-4 w-4" /> Acknowledge
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <RecordDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title={form.id ? 'Edit Policy' : 'New Policy'}
        onSave={save}
        onDiscard={() => setDrawerOpen(false)}
        loading={saving}
      >
        <div className="space-y-4">
          <FormField label="Title" required>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Anti-Corruption Policy"
            />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Type">
              <Input
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                placeholder="Governance"
              />
            </FormField>
            <FormField label="Version">
              <Input
                value={form.version}
                onChange={(e) => setForm({ ...form, version: e.target.value })}
              />
            </FormField>
          </div>
          <FormField label="Department">
            <Select
              value={form.departmentId}
              onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
            >
              <option value="">Company-wide</option>
              {(options.data?.departments ?? []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Description">
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Effective Date">
              <Input
                type="date"
                value={form.effectiveDate}
                onChange={(e) => setForm({ ...form, effectiveDate: e.target.value })}
              />
            </FormField>
            <FormField label="Status">
              <Select
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as 'ACTIVE' | 'INACTIVE' })
                }
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </Select>
            </FormField>
          </div>
          <Checkbox
            label="Mandatory"
            description="Mandatory policies count toward the Governance ack-coverage score."
            checked={form.mandatory}
            onChange={(e) => setForm({ ...form, mandatory: e.target.checked })}
          />
        </div>
      </RecordDrawer>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete this policy?"
        description="This removes the policy and its acknowledgements. This cannot be undone."
        action="Delete"
        variant="destructive"
        onConfirm={remove}
      />
    </div>
  )
}
