'use client'

// =============================================================
// Proof viewer + uploader (owner: Hetvi).
// - <ProofButton> renders a "View" trigger that opens a modal previewing
//   the submitted proof (inline image for uploaded files / image links,
//   otherwise an open-in-new-tab fallback).
// - <UploadProofButton> lets a participation owner attach an image proof.
//   The file is read into a data URL and sent to the participation proof
//   route, so it works end-to-end without external blob storage.
// Used by Employee Participation, the Approval Queue and Challenge
// Participation so every "View" surfaces the same preview.
// =============================================================
import { useRef, useState } from 'react'
import { ExternalLink, Upload, X, Loader2 } from 'lucide-react'

const MAX_BYTES = 2 * 1024 * 1024 // 2 MB — keeps the data-URL payload sane

function isImage(url: string) {
  return /^data:image\//.test(url) || /\.(png|jpe?g|gif|webp|avif|svg)(\?|$)/i.test(url)
}

/** "View" trigger that opens a modal previewing the proof. Renders a dash when empty. */
export function ProofButton({
  url,
  label = 'View',
}: {
  url?: string | null
  label?: string
}) {
  const [open, setOpen] = useState(false)
  if (!url) return <span className="text-ink-2">—</span>

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-brand-primary hover:underline"
      >
        <ExternalLink className="h-3.5 w-3.5" /> {label}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="relative z-10 flex w-full max-w-lg flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-[0_24px_60px_rgba(31,41,55,.24)]">
            <div className="flex items-center justify-between border-b border-line-soft px-4 py-3">
              <h3 className="text-sm font-semibold text-ink">Submitted proof</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-ink-2 hover:bg-hover"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex max-h-[70vh] items-center justify-center overflow-auto bg-canvas p-4">
              {isImage(url) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={url}
                  alt="Submitted proof"
                  className="max-h-[60vh] max-w-full rounded-lg object-contain"
                />
              ) : (
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand-primary hover:underline"
                >
                  Open proof in a new tab
                </a>
              )}
            </div>
            <div className="flex justify-end border-t border-line-soft px-4 py-3">
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-ink-2 hover:text-ink"
              >
                Open original ↗
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/** Lets a participation owner upload an image proof (stored as a data URL). */
export function UploadProofButton({
  participationId,
  onUploaded,
  label = 'Upload proof',
  endpoint,
}: {
  participationId: string
  onUploaded?: () => void
  label?: string
  /** Defaults to the CSR participation proof route. */
  endpoint?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const url = endpoint ?? `/api/participation/${participationId}/proof`

  const onPick = async (file: File) => {
    setError(null)
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.')
      return
    }
    if (file.size > MAX_BYTES) {
      setError('Image must be under 2 MB.')
      return
    }
    setBusy(true)
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const fr = new FileReader()
        fr.onload = () => resolve(fr.result as string)
        fr.onerror = () => reject(new Error('Could not read that file'))
        fr.readAsDataURL(file)
      })
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proofUrl: dataUrl }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Upload failed')
      }
      onUploaded?.()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-0.5">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="inline-flex items-center gap-1 rounded-md border border-brand-primary/30 px-2 py-1 text-xs font-medium text-brand-primary transition hover:bg-brand-primary/5 disabled:opacity-50"
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Upload className="h-3.5 w-3.5" />
        )}
        {label}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onPick(f)
          e.target.value = ''
        }}
      />
      {error && <span className="text-[11px] text-pill-red-fg">{error}</span>}
    </span>
  )
}
