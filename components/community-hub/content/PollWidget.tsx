'use client'

import { useState, useTransition, useMemo } from 'react'
import { Check, Vote, Loader2, Clock } from 'lucide-react'
import { cn, formatNumber } from '@/lib/utils'
import { toast } from '@/components/ui/sonner'
import { formatDistanceToNow } from 'date-fns'

interface Props {
  poll: any
  canVote: boolean
  onVoted?: () => void
}

export function PollWidget({ poll, canVote, onVoted }: Props) {
  const [pending, startTransition] = useTransition()
  const [busyOption, setBusyOption] = useState<string | null>(null)
  const [localVotes, setLocalVotes] = useState<string[]>(poll?.my_votes || [])
  const [localOptions, setLocalOptions] = useState<any[]>(poll?.options || [])
  const [totalVotes, setTotalVotes] = useState<number>(poll?.total_votes || 0)

  const isClosed = poll?.status === 'CLOSED' || (poll?.ends_at && new Date(poll.ends_at) < new Date())
  const showResults = isClosed || localVotes.length > 0

  const vote = (optionId: string) => {
    if (pending || isClosed || !canVote) return
    setBusyOption(optionId)

    // Optimistic
    const hadThis = localVotes.includes(optionId)
    const singleChoice = !poll.multiple_choice
    let newVotes: string[]
    let optionDelta = new Map<string, number>()

    if (hadThis) {
      newVotes = localVotes.filter((v) => v !== optionId)
      optionDelta.set(optionId, -1)
    } else if (singleChoice && localVotes.length > 0) {
      const prev = localVotes[0]
      newVotes = [optionId]
      optionDelta.set(prev, -1)
      optionDelta.set(optionId, 1)
    } else {
      newVotes = [...localVotes, optionId]
      optionDelta.set(optionId, 1)
    }

    const totalDelta = newVotes.length - localVotes.length
    setLocalVotes(newVotes)
    setLocalOptions((prev) =>
      prev.map((o) => {
        const d = optionDelta.get(o.id) || 0
        return { ...o, vote_count: Math.max(0, (o.vote_count || 0) + d) }
      })
    )
    setTotalVotes((t) => Math.max(0, t + totalDelta))

    startTransition(async () => {
      try {
        const res = await fetch(`/api/v1/community/polls/${poll.id}/vote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ option_id: optionId }),
        })
        const json = await res.json()
        if (!res.ok) {
          toast.error(json?.error?.message || 'Vote failed')
          // rollback
          setLocalVotes(poll?.my_votes || [])
          setLocalOptions(poll?.options || [])
          setTotalVotes(poll?.total_votes || 0)
        }
      } finally {
        setBusyOption(null)
        onVoted?.()
      }
    })
  }

  const maxCount = useMemo(() => Math.max(1, ...localOptions.map((o) => o.vote_count || 0)), [localOptions])

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-white leading-snug">{poll.question}</p>
          <div className="mt-1 flex items-center gap-2 text-[10.5px] font-mono uppercase tracking-wider text-white/45">
            <Vote className="w-3 h-3" strokeWidth={1.75} />
            {formatNumber(totalVotes)} vote{totalVotes === 1 ? '' : 's'}
            {poll.multiple_choice && <span>· multi-choice</span>}
            {poll.anonymous && <span>· anonymous</span>}
            {poll.ends_at && !isClosed && (
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3 h-3" strokeWidth={1.75} />
                ends {formatDistanceToNow(new Date(poll.ends_at), { addSuffix: true })}
              </span>
            )}
            {isClosed && <span className="text-white/40">· closed</span>}
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        {localOptions.map((o) => {
          const voted = localVotes.includes(o.id)
          const pct = totalVotes > 0 ? Math.round((o.vote_count / totalVotes) * 100) : 0
          const width = totalVotes > 0 ? (o.vote_count / maxCount) * 100 : 0
          const isBusy = busyOption === o.id

          return (
            <button
              key={o.id}
              onClick={() => vote(o.id)}
              disabled={pending || isClosed || !canVote}
              className={cn(
                'relative w-full text-left rounded-lg border overflow-hidden transition-colors',
                voted
                  ? 'border-white/[0.16] bg-white/[0.04]'
                  : 'border-white/[0.06] bg-white/[0.015] hover:bg-white/[0.03]',
                (isClosed || !canVote) && 'cursor-not-allowed opacity-90'
              )}
            >
              {showResults && (
                <div
                  className={cn('absolute inset-y-0 left-0 transition-all', voted ? 'bg-white/[0.06]' : 'bg-white/[0.03]')}
                  style={{ width: `${width}%` }}
                />
              )}
              <div className="relative px-3 py-2 flex items-center gap-3">
                <div className={cn(
                  'w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0',
                  voted ? 'border-white bg-white' : 'border-white/[0.14]'
                )}>
                  {voted && <Check className="w-2.5 h-2.5 text-black" strokeWidth={3} />}
                </div>
                <span className="flex-1 text-[12.5px] text-white/85 truncate">{o.label}</span>
                {isBusy && <Loader2 className="w-3 h-3 animate-spin text-white/60" />}
                {showResults && (
                  <span className="text-[11px] font-mono text-white/60 numeric flex-shrink-0">
                    {pct}%
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {!canVote && !isClosed && (
        <p className="text-[11px] text-white/45 leading-relaxed">Only active members can vote.</p>
      )}
    </div>
  )
}