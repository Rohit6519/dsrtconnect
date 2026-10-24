'use client'

import { useState, useTransition } from 'react'
import { ThumbsUp, PartyPopper, Lightbulb, Heart } from 'lucide-react'
import { cn, formatNumber } from '@/lib/utils'
import { toast } from '@/components/ui/sonner'

const REACTIONS = [
  { key: 'like', label: 'Like', icon: ThumbsUp },
  { key: 'celebrate', label: 'Celebrate', icon: PartyPopper },
  { key: 'insightful', label: 'Insightful', icon: Lightbulb },
  { key: 'support', label: 'Support', icon: Heart },
]

interface Props {
  targetType: 'post' | 'comment' | 'announcement'
  targetId: string
  myReaction: string | null
  count: number
  onChange?: (delta: number, newReaction: string | null) => void
}

export function ReactionBar({ targetType, targetId, myReaction, count, onChange }: Props) {
  const [pending, startTransition] = useTransition()
  const [current, setCurrent] = useState<string | null>(myReaction)
  const [localCount, setLocalCount] = useState(count)

  const toggle = (rk: string) => {
    if (pending) return
    const prev = current
    let newVal: string | null
    let delta = 0
    if (prev === rk) { newVal = null; delta = -1 }
    else if (prev) { newVal = rk; delta = 0 }
    else { newVal = rk; delta = 1 }

    setCurrent(newVal)
    setLocalCount((c) => Math.max(0, c + delta))
    onChange?.(delta, newVal)

    startTransition(async () => {
      const res = await fetch('/api/v1/community/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_type: targetType, target_id: targetId, reaction_type: rk }),
      })
      if (!res.ok) {
        // rollback
        setCurrent(prev)
        setLocalCount((c) => Math.max(0, c - delta))
        onChange?.(-delta, prev)
        toast.error('Reaction failed')
      }
    })
  }

  return (
    <div className="flex items-center gap-1">
      {REACTIONS.map((r) => {
        const Icon = r.icon
        const active = current === r.key
        return (
          <button
            key={r.key}
            onClick={() => toggle(r.key)}
            aria-label={r.label}
            title={r.label}
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
              active
                ? 'border-white/[0.16] bg-white/[0.08] text-white'
                : 'border-white/[0.06] bg-white/[0.02] text-white/60 hover:bg-white/[0.05] hover:text-white'
            )}
          >
            <Icon className="w-3 h-3" strokeWidth={1.75} />
          </button>
        )
      })}
      {localCount > 0 && (
        <span className="ml-1 text-[11px] text-white/45 numeric">{formatNumber(localCount)}</span>
      )}
    </div>
  )
}