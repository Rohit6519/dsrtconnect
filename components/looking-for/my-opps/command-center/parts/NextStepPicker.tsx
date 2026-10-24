'use client'

import type { NextStepOption } from '@/lib/applications/stageActionSpec'
import { Circle } from '@phosphor-icons/react'

interface Props {
  value: string
  onChange: (v: string) => void
  options: NextStepOption[]
}

export function NextStepPicker({ value, onChange, options }: Props) {
  return (
    <div className="space-y-1.5">
      {options.map(o => {
        const active = value === o.key
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => onChange(o.key)}
            className={
              'w-full flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors ' +
              (active
                ? 'border-zinc-600 bg-zinc-900'
                : 'border-zinc-800 hover:border-zinc-700 bg-zinc-950/50 hover:bg-zinc-900/50')
            }
          >
            {active
                ? <Circle size={13} weight="fill" className="text-white mt-0.5 shrink-0" />
                : <Circle size={13} weight="regular" className="text-zinc-600 mt-0.5 shrink-0" />}
            <div className="min-w-0">
              <div className={'text-[13px] font-semibold ' + (active ? 'text-white' : 'text-zinc-300')}>
                {o.label}
              </div>
              {o.hint && (
                <div className="text-[11.5px] text-zinc-500 mt-0.5 leading-snug">{o.hint}</div>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}