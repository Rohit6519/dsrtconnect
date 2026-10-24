'use client'

import * as React from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

// -----------------------------------------------------------
// ReasonPromptDialog — reason input replacement for prompt()
// -----------------------------------------------------------

export interface ReasonPromptDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  placeholder?: string
  submitLabel?: string
  cancelLabel?: string
  required?: boolean
  destructive?: boolean
  loading?: boolean
  onSubmit: (reason: string) => void | Promise<void>
}

export function ReasonPromptDialog({
  open,
  onOpenChange,
  title,
  description,
  placeholder = 'Optional context…',
  submitLabel = 'Submit',
  cancelLabel = 'Cancel',
  required = false,
  destructive = false,
  loading = false,
  onSubmit,
}: ReasonPromptDialogProps) {
  const [reason, setReason] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)
  const inputRef = React.useRef<HTMLTextAreaElement>(null)

  React.useEffect(() => {
    if (open) {
      setReason('')
      setSubmitting(false)
      // Focus after mount
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const canSubmit = required ? reason.trim().length > 0 : true
  const isBusy = submitting || loading

  const handleSubmit = async () => {
    if (!canSubmit || isBusy) return
    setSubmitting(true)
    try {
      await onSubmit(reason.trim())
      onOpenChange(false)
    } catch (err) {
      // Parent should handle the error via toast; keep dialog open
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !isBusy && onOpenChange(v)}>
      <DialogContent className="bg-[#0c0c12] border-white/[0.08] text-white max-w-md sm:rounded-2xl p-0 gap-0">
        <div className="p-5 space-y-4">
          <div className="flex items-start gap-3">
            {destructive && (
              <div className="w-9 h-9 rounded-lg border border-red-500/25 bg-red-500/10 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-4 h-4 text-red-300" strokeWidth={1.75} />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="label-mono text-white/50 mb-1">
                {destructive ? 'Confirm action' : 'Please provide details'}
              </p>
              <h3 className="text-[15px] font-semibold text-white leading-tight">{title}</h3>
              {description && (
                <p className="mt-1.5 text-[12.5px] text-white/60 leading-relaxed">
                  {description}
                </p>
              )}
            </div>
          </div>

          <div>
            <textarea
              ref={inputRef}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={placeholder}
              rows={4}
              disabled={isBusy}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  handleSubmit()
                }
              }}
              className={cn(
                'w-full rounded-lg border border-white/[0.08] bg-white/[0.02]',
                'focus:border-white/[0.18] outline-none px-3 py-2.5 text-[13px] text-white',
                'placeholder:text-white/30 resize-none leading-relaxed',
                isBusy && 'opacity-60'
              )}
            />
            {required && (
              <p className="mt-1.5 text-[11px] text-white/40">Required · ⌘/Ctrl + Enter to submit</p>
            )}
          </div>
        </div>

        <div className="border-t border-white/[0.06] p-4 flex items-center justify-end gap-2">
          <button
            onClick={() => !isBusy && onOpenChange(false)}
            disabled={isBusy}
            className="text-[12px] text-white/60 hover:text-white transition-colors px-3 py-2"
          >
            {cancelLabel}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || isBusy}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-semibold transition-colors',
              destructive
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-white text-black hover:bg-zinc-100',
              (!canSubmit || isBusy) && 'opacity-60 cursor-not-allowed'
            )}
          >
            {isBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {submitLabel}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// -----------------------------------------------------------
// ConfirmDialog — yes/no replacement for confirm()
// -----------------------------------------------------------

export interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  loading?: boolean
  onConfirm: () => void | Promise<void>
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  const [submitting, setSubmitting] = React.useState(false)
  const isBusy = submitting || loading

  React.useEffect(() => {
    if (open) setSubmitting(false)
  }, [open])

  const handle = async () => {
    if (isBusy) return
    setSubmitting(true)
    try {
      await onConfirm()
      onOpenChange(false)
    } catch {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !isBusy && onOpenChange(v)}>
      <DialogContent className="bg-[#0c0c12] border-white/[0.08] text-white max-w-md sm:rounded-2xl p-0 gap-0">
        <div className="p-5">
          <div className="flex items-start gap-3">
            {destructive && (
              <div className="w-9 h-9 rounded-lg border border-red-500/25 bg-red-500/10 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-4 h-4 text-red-300" strokeWidth={1.75} />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="label-mono text-white/50 mb-1">
                {destructive ? 'Confirm action' : 'Are you sure?'}
              </p>
              <h3 className="text-[15px] font-semibold text-white leading-tight">{title}</h3>
              {description && (
                <p className="mt-1.5 text-[12.5px] text-white/60 leading-relaxed">
                  {description}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-white/[0.06] p-4 flex items-center justify-end gap-2">
          <button
            onClick={() => !isBusy && onOpenChange(false)}
            disabled={isBusy}
            className="text-[12px] text-white/60 hover:text-white transition-colors px-3 py-2"
          >
            {cancelLabel}
          </button>
          <button
            onClick={handle}
            disabled={isBusy}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-semibold transition-colors',
              destructive
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-white text-black hover:bg-zinc-100',
              isBusy && 'opacity-60 cursor-not-allowed'
            )}
          >
            {isBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}