'use client'

import { useEffect, useMemo, useState } from 'react'
import { MagnifyingGlass } from '@phosphor-icons/react'

interface Variable {
  key: string
  category: string
  label: string
  description: string | null
  example: string | null
  is_safe: boolean
}

export function VariablePicker({ onInsert }: { onInsert: (token: string) => void }) {
  const [vars, setVars] = useState<Variable[] | null>(null)
  const [q, setQ] = useState('')

  useEffect(() => {
    fetch('/api/recruitment/variables')
      .then(r => r.json())
      .then(d => setVars(d.variables || []))
      .catch(() => setVars([]))
  }, [])

  const filtered = useMemo(() => {
    const list = vars || []
    if (!q.trim()) return list
    const s = q.toLowerCase()
    return list.filter(v => v.key.toLowerCase().includes(s) || v.label.toLowerCase().includes(s))
  }, [vars, q])

  const grouped = useMemo(() => {
    const g = new Map<string, Variable[]>()
    for (const v of filtered) {
      if (!g.has(v.category)) g.set(v.category, [])
      g.get(v.category)!.push(v)
    }
    return Array.from(g.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [filtered])

  return (
    <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 overflow-hidden">
      <div className="px-3 py-2.5 border-b border-zinc-800/80">
        <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
          Insert variable
        </div>
        <div className="relative">
          <MagnifyingGlass size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search variables…"
            className="w-full h-8 pl-7 pr-2 rounded-md bg-zinc-950 border border-zinc-800 text-[12px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700"
          />
        </div>
      </div>

      <div className="max-h-[520px] overflow-y-auto p-2 space-y-3">
        {grouped.length === 0 && (
          <div className="text-[11.5px] text-zinc-500 p-2 text-center">No matches.</div>
        )}
        {grouped.map(([cat, list]) => (
          <div key={cat}>
            <div className="text-[9.5px] font-bold uppercase tracking-widest text-zinc-500 px-1 mb-1.5">{cat}</div>
            <div className="space-y-1">
              {list.map(v => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => onInsert(v.key)}
                  className="w-full text-left px-2.5 py-2 rounded-md border border-zinc-800 hover:border-zinc-700 bg-zinc-950/60 hover:bg-zinc-900 transition-colors"
                  title={`Insert {{${v.key}}}`}
                >
                  <div className="text-[11.5px] font-semibold text-white">{v.label}</div>
                  <div className="text-[10px] font-mono text-zinc-500 truncate">{`{{${v.key}}}`}</div>
                  {!v.is_safe && (
                    <div className="text-[10px] text-amber-400 mt-0.5">Requires context (e.g. interview scheduled)</div>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}