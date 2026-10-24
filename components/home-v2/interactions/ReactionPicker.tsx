'use client'

import { useState, useRef, useEffect } from 'react'
import { Heart, ThumbsUp, Lightbulb, Confetti, HandsClapping, Question } from '@phosphor-icons/react'

export interface ReactionOption {
  type: string
  label: string
  Icon: any
  color: string
}

export const REACTIONS: ReactionOption[] = [
  { type: 'like',       label: 'Like',       Icon: ThumbsUp,      color: 'text-blue-400' },
  { type: 'love',       label: 'Love',       Icon: Heart,         color: 'text-pink-500' },
  { type: 'insightful', label: 'Insightful', Icon: Lightbulb,     color: 'text-amber-400' },
  { type: 'celebrate',  label: 'Celebrate',  Icon: Confetti,      color: 'text-purple-400' },
  { type: 'support',    label: 'Support',    Icon: HandsClapping, color: 'text-emerald-400' },
  { type: 'curious',    label: 'Curious',    Icon: Question,      color: 'text-cyan-400' },
]

interface Props {
  currentReaction: string | null
  onSelect: (type: string) => void
  onClose: () => void
}

export function ReactionPicker({ currentReaction, onSelect, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    setTimeout(() => window.addEventListener('click', handler), 0)
    return () => window.removeEventListener('click', handler)
  }, [onClose])

  return (
    <div
      ref={ref}
      className={
        'absolute bottom-full left-0 mb-2 flex items-center gap-1 px-2 py-1.5 rounded-full ' +
        'bg-zinc-950/95 backdrop-blur-md border border-zinc-800 ' +
        'shadow-[0_8px_28px_rgba(0,0,0,0.6)] z-40'
      }
    >
      {REACTIONS.map(r => {
        const isActive = currentReaction === r.type
        return (
          <button
            key={r.type}
            onClick={(e) => { e.stopPropagation(); onSelect(r.type) }}
            className={
              'group relative w-8 h-8 rounded-full flex items-center justify-center transition-all ' +
              'hover:scale-125 hover:-translate-y-1 ' +
              (isActive ? 'bg-white/[0.06]' : 'hover:bg-white/[0.04]')
            }
            aria-label={r.label}
            title={r.label}
          >
            <r.Icon size={16} weight={isActive ? 'fill' : 'regular'} className={isActive ? r.color : 'text-zinc-300'} />
            <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] font-bold text-white bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              {r.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}