'use client'

import { useState, useRef, useEffect } from 'react'
import { Globe, Users, UsersThree, Lock, CaretDown, Check } from '@phosphor-icons/react'
import { useComposer } from './ComposerContext'

const OPTIONS = [
  { value: 'global', label: 'Public', description: 'Anyone on DSRT', Icon: Globe },
  { value: 'followers', label: 'Followers', description: 'Only your followers', Icon: Users },
  { value: 'connections', label: 'Connections', description: 'Only mutual connections', Icon: UsersThree },
  { value: 'private', label: 'Only me', description: 'Draft-like — no one else sees', Icon: Lock },
]

export function VisibilityPicker() {
  const composer = useComposer()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) window.addEventListener('click', handler)
    return () => window.removeEventListener('click', handler)
  }, [open])

  const current = OPTIONS.find(o => o.value === composer.visibility) || OPTIONS[0]
  const CurrentIcon = current.Icon

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-zinc-800 hover:border-zinc-700 bg-zinc-950 text-[12px] font-medium text-zinc-200 transition-colors"
      >
        <CurrentIcon size={11} weight="regular" className="text-zinc-400" />
        <span>{current.label}</span>
        <CaretDown size={9} weight="bold" className="text-zinc-500" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-64 rounded-lg border border-zinc-800 bg-[#0f0f0f] shadow-[0_8px_32px_rgba(0,0,0,0.6)] z-40 overflow-hidden">
          {OPTIONS.map(opt => {
            const isActive = composer.visibility === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => { composer.setVisibility(opt.value); setOpen(false) }}
                className="w-full flex items-start gap-2.5 px-3 py-2.5 hover:bg-zinc-900 transition-colors text-left"
              >
                <opt.Icon size={12} weight="regular" className="text-zinc-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] font-semibold text-zinc-100">{opt.label}</div>
                  <div className="text-[10.5px] text-zinc-500">{opt.description}</div>
                </div>
                {isActive && <Check size={11} weight="bold" className="text-amber-400 mt-0.5 shrink-0" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}