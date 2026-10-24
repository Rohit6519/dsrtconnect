'use client'

import { CaretDown } from '@phosphor-icons/react'

interface Props {
  value: string
  options: { value: string; label: string }[]
  onSave: (v: string) => void | Promise<void>
  disabled?: boolean
}

export function QuestionSelectEditor({ value, options, onSave, disabled = false }: Props) {
  const selected = options.find(o => o.value === value)

  if (disabled) {
    return (
      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5">
        {selected ? (
          <p className="text-[13.5px] text-white/85">{selected.label}</p>
        ) : (
          <p className="text-[13px] text-white/35 italic">Not answered yet</p>
        )}
      </div>
    )
  }

  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onSave(e.target.value)}
        className="w-full h-10 pl-3.5 pr-9 appearance-none rounded-lg bg-white/[0.03] border border-white/[0.08] hover:border-white/[0.15] focus:border-white/[0.25] text-[13.5px] text-white focus:outline-none transition-colors cursor-pointer"
      >
        <option value="" className="bg-[#121215]">Select…</option>
        {options.map(o => (
          <option key={o.value} value={o.value} className="bg-[#121215]">
            {o.label}
          </option>
        ))}
      </select>
      <CaretDown
        size={12}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none"
      />
    </div>
  )
}