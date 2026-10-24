'use client'

import { useEffect, useState, useTransition } from 'react'
import { Flag, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from '@/components/ui/sonner'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'

interface ReportSubmitInput {
  communityId: string
  targetType: 'post' | 'comment' | 'announcement' | 'member' | 'resource'
  targetId: string
}

// -----------------------------------------------------------
// Module-level cache for reasons (fetched once per session)
// -----------------------------------------------------------
let cachedReasons: Array<{ code: string; label: string; description: string }> = []
let fetchInFlight: Promise<void> | null = null

async function ensureReasonsLoaded() {
  if (cachedReasons.length > 0) return
  if (fetchInFlight) return fetchInFlight
  fetchInFlight = fetch('/api/v1/community/reports/reasons')
    .then((r) => r.json())
    .then((j) => {
      cachedReasons = j?.data?.reasons || []
    })
    .catch(() => {
      cachedReasons = []
    })
    .finally(() => {
      fetchInFlight = null
    })
  return fetchInFlight
}

// -----------------------------------------------------------
// Body — the actual form UI shared by both trigger + controlled
// -----------------------------------------------------------

interface BodyProps extends ReportSubmitInput {
  onDone: () => void
}

function ReportBody({ communityId, targetType, targetId, onDone }: BodyProps) {
  const [reasons, setReasons] = useState(cachedReasons)
  const [selected, setSelected] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    let cancelled = false
    if (reasons.length === 0) {
      ensureReasonsLoaded().then(() => {
        if (!cancelled) setReasons(cachedReasons)
      })
    }
    return () => {
      cancelled = true
    }
  }, [reasons.length])

  const submit = () => {
    if (!selected) {
      toast.error('Choose a reason')
      return
    }
    startTransition(async () => {
      const res = await fetch('/api/v1/community/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          community_id: communityId,
          target_type: targetType,
          target_id: targetId,
          reason: selected,
          description: description.trim() || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json?.error?.message || 'Report failed')
        return
      }
      toast.success('Report submitted. Moderators will review.')
      onDone()
    })
  }

  return (
    <>
      <div className="p-5 border-b border-white/[0.06] flex items-center justify-between">
        <div>
          <p className="label-mono text-white/50">Moderation</p>
          <p className="mt-1 text-[15px] font-semibold text-white">Report {targetType}</p>
        </div>
        <button
          onClick={onDone}
          className="w-8 h-8 rounded-full text-white/50 hover:text-white hover:bg-white/[0.06] flex items-center justify-center"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
        <div>
          <p className="label-mono text-white/50 mb-2">Reason</p>
          <div className="space-y-1.5">
            {reasons.length === 0 ? (
              <div className="flex items-center gap-2 text-[12px] text-white/50 py-2">
                <Loader2 className="w-3 h-3 animate-spin" />
                Loading reasons…
              </div>
            ) : (
              reasons.map((r) => (
                <button
                  key={r.code}
                  onClick={() => setSelected(r.code)}
                  className={cn(
                    'w-full text-left rounded-lg border p-3 transition-colors',
                    selected === r.code
                      ? 'border-white/[0.18] bg-white/[0.06]'
                      : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'
                  )}
                >
                  <p className="text-[13px] font-semibold text-white">{r.label}</p>
                  <p className="mt-0.5 text-[11.5px] text-white/55 leading-relaxed">{r.description}</p>
                </button>
              ))
            )}
          </div>
        </div>

        <div>
          <p className="label-mono text-white/50 mb-2">Additional context (optional)</p>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Explain what happened…"
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.02] focus:border-white/[0.18] outline-none px-3 py-2 text-[12.5px] text-white placeholder:text-white/30 resize-none"
          />
        </div>
      </div>

      <div className="p-5 border-t border-white/[0.06] flex items-center justify-end gap-2">
        <button
          onClick={onDone}
          className="text-[12px] text-white/50 hover:text-white px-3 py-2 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={pending || !selected}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-semibold transition-colors',
            selected ? 'bg-white text-black hover:bg-zinc-100' : 'bg-white/[0.06] text-white/40 cursor-not-allowed'
          )}
        >
          {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Flag className="w-3.5 h-3.5" strokeWidth={1.75} />}
          Submit report
        </button>
      </div>
    </>
  )
}

// -----------------------------------------------------------
// Public: <ReportModal> — has its own DialogTrigger button
// Use standalone. NOT for use inside a DropdownMenuItem.
// -----------------------------------------------------------

interface ReportModalProps extends ReportSubmitInput {
  trigger?: React.ReactNode
}

export function ReportModal({ communityId, targetType, targetId, trigger }: ReportModalProps) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (open) ensureReasonsLoaded()
  }, [open])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <button className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] text-white/60 hover:text-white px-3 py-1 text-[11px] font-medium transition-colors">
            <Flag className="w-3 h-3" strokeWidth={1.75} />
            Report
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-[#0c0c12] border-white/[0.08] text-white max-w-md sm:rounded-2xl p-0 gap-0">
        <ReportBody
          communityId={communityId}
          targetType={targetType}
          targetId={targetId}
          onDone={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

// -----------------------------------------------------------
// Public: <ControlledReportModal> — parent controls open state
// Use this from inside a DropdownMenu, using onSelect to set open=true.
// This is the correct pattern that avoids Radix focus conflicts.
// -----------------------------------------------------------

interface ControlledProps extends ReportSubmitInput {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ControlledReportModal({
  open,
  onOpenChange,
  communityId,
  targetType,
  targetId,
}: ControlledProps) {
  useEffect(() => {
    if (open) ensureReasonsLoaded()
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0c0c12] border-white/[0.08] text-white max-w-md sm:rounded-2xl p-0 gap-0">
        <ReportBody
          communityId={communityId}
          targetType={targetType}
          targetId={targetId}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}