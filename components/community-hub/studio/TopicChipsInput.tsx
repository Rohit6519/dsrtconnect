'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

interface Props {
  value: string[]
  onChange: (topics: string[]) => void
  max?: number
  placeholder?: string
}

export function TopicChipsInput({
  value,
  onChange,
  max = 8,
  placeholder = 'Add a topic and press Enter',
}: Props) {
  const [text, setText] = useState('')

  const add = (raw: string) => {
    const t = raw.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    if (!t) return
    if (value.includes(t)) return
    if (value.length >= max) return
    onChange([...value, t])
    setText('')
  }

  const remove = (t: string) => {
    onChange(value.filter((v) => v !== t))
  }

  return (
    <div className="space-y-2">
      <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-2 py-2 flex flex-wrap gap-1.5 focus-within:border-white/[0.18] transition-colors">
        {value.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.04] text-white/80 pl-2.5 pr-1 py-0.5 text-[11px] font-mono"
          >
            {t}
            <button
              onClick={() => remove(t)}
              className="w-4 h-4 rounded-full hover:bg-white/[0.1] flex items-center justify-center text-white/60"
            >
              <X className="w-3 h-3" strokeWidth={2} />
            </button>
          </span>
        ))}
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault()
              add(text)
            } else if (e.key === 'Backspace' && !text && value.length > 0) {
              onChange(value.slice(0, -1))
            }
          }}
          placeholder={value.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] bg-transparent outline-none py-0.5 text-[12.5px] text-white placeholder:text-white/30"
        />
      </div>
      <p className="text-[11px] text-white/40">
        {value.length} / {max} · lowercase, hyphens allowed
      </p>
    </div>
  )
}