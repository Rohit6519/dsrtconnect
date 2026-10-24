'use client'

import { useState } from 'react'
import { Plus, X } from '@phosphor-icons/react'

interface Props {
  responsibilities: string[]
  onChange: (responsibilities: string[]) => void
}

export function Step4_Responsibilities({ responsibilities, onChange }: Props) {
  const [input, setInput] = useState('')

  const add = () => {
    const trimmed = input.trim()
    if (!trimmed) return
    if (responsibilities.includes(trimmed)) return
    onChange([...responsibilities, trimmed])
    setInput('')
  }

  const remove = (idx: number) => {
    onChange(responsibilities.filter((_, i) => i !== idx))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      add()
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-[15px] font-bold text-white">Responsibilities</h3>
        <p className="text-[12.5px] text-zinc-500 mt-1">
          Optional. Add key responsibilities so the recipient understands the role.
        </p>
      </div>

      <div>
        <label className="block text-[11px] font-mono uppercase tracking-widest text-zinc-500 font-bold mb-1.5">
          Add Responsibility
        </label>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. Design and ship product features"
            className="flex-1 h-10 px-3 bg-[#0d0d10] border border-white/[0.06] rounded-lg text-[13px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/[0.15]"
          />
          <button
            onClick={add}
            disabled={!input.trim()}
            className="px-4 h-10 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-[12px] font-bold text-white disabled:opacity-40 transition-colors"
          >
            <Plus size={13} weight="bold" />
          </button>
        </div>
      </div>

      {responsibilities.length > 0 && (
        <div>
          <p className="text-[11px] font-mono uppercase tracking-widest text-zinc-500 font-bold mb-2">
            {responsibilities.length} {responsibilities.length === 1 ? 'Responsibility' : 'Responsibilities'}
          </p>
          <div className="space-y-1.5">
            {responsibilities.map((r, i) => (
              <div
                key={i}
                className="flex items-center gap-2 p-3 rounded-lg bg-[#0d0d10] border border-white/[0.06]"
              >
                <span className="text-zinc-500 text-[13px]">·</span>
                <p className="flex-1 text-[13px] text-zinc-200">{r}</p>
                <button
                  onClick={() => remove(i)}
                  className="text-zinc-500 hover:text-red-400 transition-colors"
                >
                  <X size={12} weight="bold" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}