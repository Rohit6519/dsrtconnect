'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import { X, Warning, CircleNotch, Trash, Check } from '@phosphor-icons/react'

interface Props {
  slug: string
  updateId: string
  updateTitle?: string | null
  updateAuthor?: string | null
  onClose: () => void
  onDeleted: () => void
}

const CONFIRM_KEYWORD = 'DELETE'

export function UpdateDeleteModal({
  slug, updateId, updateTitle, updateAuthor, onClose, onDeleted,
}: Props) {
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    setMounted(true)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // Autofocus
    setTimeout(() => inputRef.current?.focus(), 50)
    return () => {
      isMountedRef.current = false
      document.body.style.overflow = prev
    }
  }, [])

  // ESC to cancel
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !deleting) {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, deleting])

  const isConfirmed = confirmText.trim() === CONFIRM_KEYWORD

  const doDelete = useCallback(async () => {
    if (!isConfirmed || deleting) return
    setDeleting(true)
    setError(null)
    try {
      const res = await fetch(`/api/projects/${slug}/updates/${updateId}`, {
        method: 'DELETE',
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Delete failed')
      toast.success('Update deleted')
      onDeleted()
    } catch (e: any) {
      if (isMountedRef.current) {
        setError(e?.message || 'Could not delete update')
        setDeleting(false)
      }
    }
  }, [slug, updateId, isConfirmed, deleting, onDeleted])

  if (!mounted) return null

  const content = (
    <div
      className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-start md:items-center justify-center p-0 md:p-4 overflow-y-auto"
      onClick={(e) => { if (e.target === e.currentTarget && !deleting) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-update-title"
    >
      <div className="bg-[#0d0d10] border border-red-500/25 w-full max-w-[480px] md:rounded-2xl overflow-hidden flex flex-col shadow-[0_0_80px_rgba(220,38,38,0.15)]">

        {/* Header */}
        <div className="flex items-start gap-3 px-5 py-4 border-b border-white/[0.06] bg-red-500/[0.04]">
          <div className="w-9 h-9 rounded-lg bg-red-500/10 border border-red-500/25 flex items-center justify-center shrink-0">
            <Warning size={16} weight="fill" className="text-red-400" />
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <h3 id="delete-update-title" className="text-[15px] font-semibold text-white leading-tight">
              Delete this update?
            </h3>
            <p className="text-[12px] text-white/50 mt-0.5 leading-snug">
              This action is permanent and cannot be undone.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={deleting}
            aria-label="Cancel"
            className="w-8 h-8 rounded-md text-white/50 hover:text-white hover:bg-white/[0.06] flex items-center justify-center disabled:opacity-40 transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Update preview */}
          <div className="rounded-lg bg-white/[0.03] border border-white/[0.08] p-3">
            <p className="text-[10.5px] font-mono uppercase tracking-wider text-white/40 mb-1">
              About to delete
            </p>
            <p className="text-[13px] font-semibold text-white leading-snug line-clamp-2">
              {updateTitle || 'Untitled update'}
            </p>
            {updateAuthor && (
              <p className="text-[11.5px] text-white/45 mt-0.5">by {updateAuthor}</p>
            )}
          </div>

          {/* Consequences */}
          <ul className="space-y-1.5 text-[12.5px] text-white/60">
            <ConsequenceItem>The update, its media, and all comments will be removed.</ConsequenceItem>
            <ConsequenceItem>Followers will lose access to the shared link.</ConsequenceItem>
            <ConsequenceItem>Likes, bookmarks, and reactions will not be recoverable.</ConsequenceItem>
          </ul>

          {/* Type to confirm */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-white/50 font-semibold mb-1.5">
              Type <span className="text-red-300">{CONFIRM_KEYWORD}</span> to confirm
            </label>
            <input
              ref={inputRef}
              value={confirmText}
              onChange={(e) => { setConfirmText(e.target.value); setError(null) }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && isConfirmed && !deleting) {
                  e.preventDefault()
                  doDelete()
                }
              }}
              placeholder={CONFIRM_KEYWORD}
              disabled={deleting}
              className={
                'w-full h-10 rounded-md px-3 text-[13.5px] font-mono tracking-wider text-white bg-white/[0.04] outline-none transition-colors placeholder:text-white/25 disabled:opacity-60 ' +
                (isConfirmed
                  ? 'border border-emerald-500/40 focus:border-emerald-500/60 bg-emerald-500/[0.04]'
                  : confirmText
                  ? 'border border-red-500/30 focus:border-red-500/50'
                  : 'border border-white/[0.1] focus:border-white/25')
              }
            />
            {isConfirmed && (
              <p className="mt-1.5 text-[11px] text-emerald-400 flex items-center gap-1">
                <Check size={11} weight="bold" /> Confirmed — ready to delete
              </p>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 text-[12px] text-red-300 bg-red-500/[0.08] border border-red-500/25 rounded-md px-3 py-2">
              <Warning size={12} weight="fill" className="text-red-400 mt-0.5 shrink-0" />
              <span className="leading-snug">{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-white/[0.06] bg-[#0a0a0f] px-5 py-3.5 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            disabled={deleting}
            className="px-4 h-9 text-[13px] font-medium text-white/70 hover:text-white border border-white/[0.1] hover:bg-white/[0.04] rounded-md disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={doDelete}
            disabled={!isConfirmed || deleting}
            className={
              'px-5 h-9 text-[13px] font-semibold rounded-md flex items-center gap-1.5 transition-colors ' +
              (isConfirmed && !deleting
                ? 'bg-red-500 hover:bg-red-400 text-white'
                : 'bg-white/[0.05] text-white/30 cursor-not-allowed')
            }
          >
            {deleting ? (
              <><CircleNotch size={12} className="animate-spin" /> Deleting...</>
            ) : (
              <><Trash size={12} weight="bold" /> Delete update</>
            )}
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(content, document.body)
}

// ═══════════════════════════════════════════════════════════════════════════
// SUB
// ═══════════════════════════════════════════════════════════════════════════

function ConsequenceItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-1.5 w-1 h-1 rounded-full bg-red-400/70 shrink-0" />
      <span className="leading-snug">{children}</span>
    </li>
  )
}