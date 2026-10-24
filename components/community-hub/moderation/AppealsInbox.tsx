'use client'

import { useState, useTransition } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { MessageSquare, Check, X, Loader2, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from '@/components/ui/sonner'
import { SectionHeader, EmptyState, SkeletonRows } from '@/components/kernel-ui'
import { ReasonPromptDialog } from '@/components/ui/reason-prompt-dialog'
import { useAppealsInbox } from '@/hooks/useCommunityModeration'

interface Props {
  slug: string
}

type ActiveDecision = { appealId: string; decision: 'UPHELD' | 'OVERTURNED' } | null

export function AppealsInbox({ slug }: Props) {
  const { items, loading, reload } = useAppealsInbox(slug)
  const [pending, startTransition] = useTransition()
  const [activeDecision, setActiveDecision] = useState<ActiveDecision>(null)

  const openDecide = (id: string, decision: 'UPHELD' | 'OVERTURNED') => {
    setActiveDecision({ appealId: id, decision })
  }

  const submit = async (reason: string) => {
    const decisionSnapshot = activeDecision
    if (!decisionSnapshot) return

    const { appealId, decision } = decisionSnapshot

    return new Promise<void>((resolve, reject) => {
      startTransition(async () => {
        try {
          const res = await fetch(`/api/v1/community/appeals/${appealId}/decide`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ decision, reason }),
          })
          if (!res.ok) {
            toast.error('Decision failed')
            reject(new Error('failed'))
            return
          }
          toast.success(`Appeal ${decision.toLowerCase()}`)
          reload()
          resolve()
        } catch {
          toast.error('Network error')
          reject(new Error('network'))
        }
      })
    })
  }

  return (
    <>
      <div className="space-y-4">
        <SectionHeader
          title="Appeals"
          description="Members appealing moderation decisions."
          variant="mono"
        />

        {loading ? (
          <SkeletonRows count={3} />
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02]">
            <EmptyState icon={MessageSquare} title="No pending appeals" />
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((a: any) => {
              const isBusyOnUphold =
                pending &&
                activeDecision?.appealId === a.id &&
                activeDecision?.decision === 'UPHELD'

              const isBusyOnOverturn =
                pending &&
                activeDecision?.appealId === a.id &&
                activeDecision?.decision === 'OVERTURNED'

              return (
                <li
                  key={a.id}
                  className="rounded-xl border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-white/[0.01] p-4"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar className="w-9 h-9 border border-white/[0.06]">
                      <AvatarImage src={a.appellant?.avatar_url ?? undefined} />
                      <AvatarFallback className="text-[11px] bg-white/[0.06]">
                        {(a.appellant?.full_name || '?').charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-white flex items-center gap-1">
                        {a.appellant?.full_name}
                        {a.appellant?.is_verified && (
                          <ShieldCheck className="w-3 h-3 text-white/60" strokeWidth={1.75} />
                        )}
                      </p>
                      <p className="text-[11px] text-white/45">
                        {a.appeal_type.replace('_', ' ').toLowerCase()} ·{' '}
                        {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 mb-3">
                    <p className="text-[12.5px] text-white/80 whitespace-pre-wrap leading-relaxed">
                      {a.body}
                    </p>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => openDecide(a.id, 'UPHELD')}
                      disabled={pending}
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.02]',
                        'hover:bg-white/[0.06] text-white/80 hover:text-white px-3 py-1.5 text-[11.5px] font-medium transition-colors'
                      )}
                    >
                      {isBusyOnUphold ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <X className="w-3 h-3" strokeWidth={1.75} />
                      )}
                      Uphold action (deny appeal)
                    </button>
                    <button
                      onClick={() => openDecide(a.id, 'OVERTURNED')}
                      disabled={pending}
                      className="inline-flex items-center gap-1 rounded-full bg-white text-black hover:bg-zinc-100 px-3.5 py-1.5 text-[11.5px] font-semibold transition-colors"
                    >
                      {isBusyOnOverturn ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Check className="w-3 h-3" strokeWidth={2} />
                      )}
                      Overturn (grant appeal)
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {activeDecision && (
        <ReasonPromptDialog
          open={!!activeDecision}
          onOpenChange={(v) => !v && setActiveDecision(null)}
          title={
            activeDecision.decision === 'UPHELD'
              ? 'Uphold moderation action'
              : 'Overturn moderation action'
          }
          description={
            activeDecision.decision === 'UPHELD'
              ? 'Explain to the appellant why the original action stands.'
              : 'Explain the reversal. Any content or membership changes will be automatically restored.'
          }
          placeholder="Reason (sent to appellant)…"
          submitLabel={activeDecision.decision === 'UPHELD' ? 'Uphold' : 'Overturn'}
          destructive={false}
          required
          loading={pending}
          onSubmit={submit}
        />
      )}
    </>
  )
}