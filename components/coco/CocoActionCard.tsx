// ============================================================
// components/coco/CocoActionCard.tsx
// Renders in-chat confirmation cards for tool proposals.
// ============================================================

'use client'

import { Check, X, Loader2, Zap } from 'lucide-react'
import type { CocoUiMessage } from '@/lib/coco/sdk/types'
import { cn } from '@/lib/utils'

interface Props {
  action: NonNullable<CocoUiMessage['pendingAction']>
  onConfirm: () => void
  onCancel: () => void
}

export function CocoActionCard({ action, onConfirm, onCancel }: Props) {
  const isPending = action.status === 'pending'
  const isExecuting = action.status === 'executing' || action.status === 'confirming'
  const isDone = action.status === 'completed'
  const isFailed = action.status === 'failed'
  const isCancelled = action.status === 'cancelled'

  return (
    <div
      className={cn(
        "mt-2 rounded-lg border overflow-hidden",
        "bg-[#0B0F17] border-white/[0.06]"
      )}
    >
      <div className="px-3 py-2.5 flex items-start gap-2.5">
        <div className="w-6 h-6 rounded-md bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0 mt-0.5">
          <Zap className="w-3 h-3 text-white/60" strokeWidth={2} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-white/40 font-mono">
            {isPending ? 'Action Proposed' :
             isExecuting ? 'Executing' :
             isDone ? 'Completed' :
             isFailed ? 'Failed' :
             isCancelled ? 'Cancelled' : 'Action'}
          </p>
          <p className="text-[12.5px] text-white/90 mt-0.5 leading-snug tracking-tight">
            {action.summary}
          </p>
          <p className="text-[10.5px] text-white/40 font-mono mt-1">
            {action.toolName}
          </p>
        </div>
      </div>

      {isPending && (
        <div className="border-t border-white/[0.05] px-3 py-2 flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="text-[11.5px] font-medium text-white/60 hover:text-white/90 px-2.5 h-7 rounded-md hover:bg-white/[0.04] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="text-[11.5px] font-medium text-black bg-white hover:bg-white/90 px-3 h-7 rounded-md transition-colors flex items-center gap-1.5"
          >
            <Check className="w-3 h-3" strokeWidth={2.5} />
            Execute
          </button>
        </div>
      )}

      {isExecuting && (
        <div className="border-t border-white/[0.05] px-3 py-2 flex items-center gap-2">
          <Loader2 className="w-3 h-3 text-white/50 animate-spin" />
          <span className="text-[11px] text-white/50 font-mono">Running...</span>
        </div>
      )}

      {isDone && (
        <div className="border-t border-white/[0.05] px-3 py-2 flex items-center gap-2">
          <Check className="w-3 h-3 text-emerald-400/80" strokeWidth={2.5} />
          <span className="text-[11px] text-white/60 font-mono">Verified</span>
        </div>
      )}

      {isFailed && (
        <div className="border-t border-white/[0.05] px-3 py-2 flex items-center gap-2">
          <X className="w-3 h-3 text-red-400/80" strokeWidth={2.5} />
          <span className="text-[11px] text-white/60 font-mono">Failed</span>
        </div>
      )}
    </div>
  )
}