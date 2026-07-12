'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, HandHeart, Pencil, Trash2, Paperclip } from 'lucide-react'
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
import type { CsrActivityView } from '@/server/services/social/csr'

interface FormState {
  id?: string
  title: string
  categoryId: string
  description: string
  date: string
  points: number
  evidenceRequired: boolean
  status: 'ACTIVE' | 'INACTIVE'
}
const EMPTY: FormState = {
  title: '',
  categoryId: '',
  description: '',
  date: '',
  points: 50,
  evidenceRequired: true,
  status: 'ACTIVE',
}

export default function CsrActivitiesPage() {
  const { role } = useCurrentUser()
  const { toast } = useToast()
  const qc = useQueryClient()
  const options = useOptions()

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: activities = [], isLoading } = useQuery<CsrActivityView[]>({
    queryKey: ['csr-activities'],
    queryFn: () => apiGet<CsrActivityView[]>('/api/csr-activities'),
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['csr-activities'] })
    qc.invalidateQueries({ queryKey: ['participation'] })
  }

  const joinMutation = useMutation({
    mutationFn: (activityId: string) => apiPost('/api/participation', { activityId }),
    onSuccess: () => {
      toast({ title: 'Joined activity', description: 'Your participation is pending approval.' })
      invalidate()
    },
    onError: (e: ApiError) =>
      toast({ title: 'Could not join', description: e.message, variant: 'error' }),
  })

  const csrCategories = (options.data?.categories ?? []).filter((c) => c.type === 'CSR_ACTIVITY')
  const canManage = can.manageCsr(role)

  const openCreate = () => {
    setForm(EMPTY)
    setDrawerOpen(true)
  }
  const openEdit = (a: CsrActivityView) => {
    setForm({
      id: a.id,
      title: a.title,
      categoryId: a.categoryId ?? '',
      description: a.description ?? '',
      date: a.date ? new Date(a.date).toISOString().slice(0, 10) : '',
      points: a.points,
      evidenceRequired: a.evidenceRequired,
      status: a.status as 'ACTIVE' | 'INACTIVE',
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
        categoryId: form.categoryId || undefined,
        description: form.description || undefined,
        date: form.date || undefined,
        points: Number(form.points),
        evidenceRequired: form.evidenceRequired,
        status: form.status,
      }
      if (form.id) await apiPatch(`/api/csr-activities/${form.id}`, payload)
      else await apiPost('/api/csr-activities', payload)
      toast({ title: form.id ? 'Activity updated' : 'Activity created' })
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
      await apiDelete(`/api/csr-activities/${deleteId}`)
      toast({ title: 'Activity deleted' })
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
        title="CSR Activities"
        subtitle="Social initiatives employees can join to earn participation points."
      >
        {canManage && (
          <Button onClick={openCreate}>
            <Plus className="mr-1 h-4 w-4" /> New Activity
          </Button>
        )}
      </PageHeader>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-xl bg-black/5" />
          ))}
        </div>
      ) : activities.length === 0 ? (
        <EmptyState
          icon="🤝"
          title="No CSR activities yet"
          description="Create the first social initiative for employees to join."
          action={canManage ? { label: 'New Activity', onClick: openCreate } : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {activities.map((a) => (
            <div
              key={a.id}
              className="flex flex-col rounded-xl border border-black/5 bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
                  <HandHeart className="h-5 w-5" />
                </span>
                <div className="flex items-center gap-2">
                  {a.evidenceRequired && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                      <Paperclip className="h-3 w-3" /> Evidence
                    </span>
                  )}
                  <StatusPill status={a.status} />
                </div>
              </div>

              <h3 className="mt-3 font-semibold text-brand-text">{a.title}</h3>
              {a.categoryName && (
                <p className="text-xs font-medium text-brand-primary">{a.categoryName}</p>
              )}
              <p className="mt-1 line-clamp-2 flex-1 text-sm text-brand-muted">
                {a.description || 'No description provided.'}
              </p>

              <div className="mt-4 flex items-center justify-between border-t border-black/5 pt-3">
                <div className="text-xs text-brand-muted">
                  <span className="font-semibold text-brand-text">{a.joinedCount}</span> joined ·{' '}
                  <span className="font-semibold text-brand-primary">+{a.points} pts</span>
                </div>
                <div className="flex items-center gap-2">
                  {canManage && (
                    <>
                      <button
                        onClick={() => openEdit(a)}
                        className="rounded-md p-1.5 text-brand-muted hover:bg-brand-surface"
                        aria-label="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteId(a.id)}
                        className="rounded-md p-1.5 text-brand-muted hover:bg-red-50 hover:text-red-600"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                  <Button
                    size="sm"
                    disabled={joinMutation.isPending || a.status !== 'ACTIVE'}
                    onClick={() => joinMutation.mutate(a.id)}
                  >
                    Join
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <RecordDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title={form.id ? 'Edit CSR Activity' : 'New CSR Activity'}
        onSave={save}
        onDiscard={() => setDrawerOpen(false)}
        loading={saving}
      >
        <div className="space-y-4">
          <FormField label="Title" required>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Tree Plantation Drive"
            />
          </FormField>
          <FormField label="Category">
            <Select
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            >
              <option value="">— Select category —</option>
              {csrCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Description">
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="What is this activity about?"
            />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Date">
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </FormField>
            <FormField label="Points">
              <Input
                type="number"
                min={0}
                value={form.points}
                onChange={(e) => setForm({ ...form, points: Number(e.target.value) })}
              />
            </FormField>
          </div>
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
          <Checkbox
            label="Evidence required"
            description="Participants must attach proof before they can be approved."
            checked={form.evidenceRequired}
            onChange={(e) => setForm({ ...form, evidenceRequired: e.target.checked })}
          />
        </div>
      </RecordDrawer>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete this activity?"
        description="This removes the activity and any participation records tied to it. This cannot be undone."
        action="Delete"
        variant="destructive"
        onConfirm={remove}
      />
    </div>
  )
}
