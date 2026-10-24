'use client'

import { useState, KeyboardEvent } from 'react'
import { X, Plus } from '@phosphor-icons/react'

interface Props {
  value: string[]
  onChange: (skills: string[]) => void
  placeholder?: string
}

export function SkillsPicker({ value, onChange, placeholder = 'Add skill...' }: Props) {
  const [input, setInput] = useState('')

  const addSkill = (raw: string) => {
    const s = raw.trim()
    if (!s || value.some(v => v.toLowerCase() === s.toLowerCase())) {
      setInput('')
      return
    }
    onChange([...value, s])
    setInput('')
  }

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addSkill(input)
    } else if (e.key === 'Backspace' && !input && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  return (
    <div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {value.map((s, i) => (
            <span
              key={s + i}
              className="inline-flex items-center gap-1 h-6 pl-2 pr-1 rounded bg-zinc-900 border border-zinc-800 text-[11.5px] font-medium text-zinc-200"
            >
              {s}
              <button
                onClick={() => onChange(value.filter((_, idx) => idx !== i))}
                className="w-4 h-4 rounded flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-zinc-800"
              >
                <X size={9} weight="bold" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          onBlur={() => input && addSkill(input)}
          placeholder={placeholder}
          className="w-full h-9 pl-3 pr-8 rounded-md bg-zinc-950 border border-zinc-800 text-[12.5px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700"
        />
        {input && (
          <button
            onClick={() => addSkill(input)}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-900"
          >
            <Plus size={11} weight="bold" />
          </button>
        )}
      </div>
      <p className="text-[10.5px] text-zinc-600 mt-1.5">Press Enter or comma to add</p>
    </div>
  )
}