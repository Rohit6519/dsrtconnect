'use client'

import { useEffect, useRef, useState } from 'react'
import { Plus, CaretDown } from '@phosphor-icons/react'
import {
  QUESTION_GROUPS,
  QUESTION_TYPE_META,
  type QuestionType,
} from './questionTypes'

export function AddQuestionMenu({
  onSelect,
  disabled,
}: {
  onSelect: (type: QuestionType) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl bg-white text-black hover:bg-zinc-100 text-[12.5px] font-bold shadow-[0_2px_12px_rgba(255,255,255,0.1)] disabled:opacity-60"
      >
        <Plus size={12} weight="bold" />
        Add question
        <CaretDown size={10} weight="bold" className="opacity-70" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[420px] max-h-[420px] overflow-y-auto rounded-xl border border-zinc-800 bg-[#0c0c0e] shadow-[0_12px_40px_rgba(0,0,0,0.6)] z-40">
          {QUESTION_GROUPS.map((group) => (
            <div
              key={group.title}
              className="border-b border-zinc-800/70 last:border-b-0"
            >
              <div className="px-4 pt-3 pb-1 text-[10.5px] font-bold uppercase tracking-wider text-zinc-500">
                {group.title}
              </div>
              {group.types.map((t) => {
                const meta = QUESTION_TYPE_META[t]
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      onSelect(t)
                      setOpen(false)
                    }}
                    className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-zinc-900 transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-lg border border-zinc-800 bg-zinc-950 flex items-center justify-center text-zinc-400 shrink-0">
                      <meta.Icon size={13} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[12.5px] font-bold text-white">
                        {meta.label}
                      </div>
                      <div className="text-[11px] text-zinc-500 leading-snug">
                        {meta.hint}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}