'use client'

import { useState, useEffect } from 'react'
import { X, Rocket, Buildings, MagnifyingGlass } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

interface EntityAttachment {
  type: 'venture' | 'project'
  id: string
  name: string
  slug: string
  logo_url?: string
}

interface Props {
  onClose: () => void
  onAttach: (entity: EntityAttachment) => void
  type: 'venture' | 'project'
}

export function EntityAttachPicker({ onClose, onAttach, type }: Props) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (q.length < 2) { setResults([]); return }
    setLoading(true)
    const t = setTimeout(async () => {
      try {
        // Search by identity type
        const res = await fetch(`/api/mail/recipients/search?q=${encodeURIComponent(q)}`)
        const data = await res.json()
        const filtered = (data.results || []).filter((r: any) => r.entity_type === type)
        setResults(filtered)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 200)
    return () => clearTimeout(t)
  }, [q, type])

  const Icon = type === 'venture' ? Buildings : Rocket
  const label = type === 'venture' ? 'Venture' : 'Project'
  const color = type === 'venture' ? 'text-violet-400' : 'text-emerald-400'

  return (
    <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-[520px] rounded-2xl bg-gradient-to-b from-[#141419] to-[#0a0a0f] border border-white/[0.1] shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <h3 className="text-[15px] font-bold text-white tracking-tight">Attach {label}</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-md hover:bg-white/[0.06] text-white/50 hover:text-white flex items-center justify-center">
            <X className="w-3.5 h-3.5" weight="bold" />
          </button>
        </div>

        <div className="p-4">
          <div className="relative">
            <MagnifyingGlass className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              autoFocus
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder={`Search ${label.toLowerCase()}s...`}
              className="w-full h-10 pl-9 pr-3 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[13px] text-white placeholder:text-white/40 focus:outline-none focus:border-white/[0.15]"
            />
          </div>
        </div>

        <div className="max-h-[360px] overflow-y-auto p-2">
          {q.length < 2 ? (
            <p className="text-center text-[12px] text-white/40 py-8">Type at least 2 characters to search</p>
          ) : loading ? (
            <p className="text-center text-[12px] text-white/40 py-8">Searching...</p>
          ) : results.length === 0 ? (
            <p className="text-center text-[12px] text-white/40 py-8">No {label.toLowerCase()}s found</p>
          ) : (
            results.map(r => (
              <button
                key={r.identity_id}
                onClick={() => onAttach({
                  type,
                  id: r.entity_id,
                  name: r.display_name,
                  slug: r.dsrt_email.replace('@dsrt.com', ''),
                  logo_url: r.avatar_url,
                })}
                className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/[0.04] transition-colors text-left"
              >
                <div className="w-9 h-9 rounded-lg overflow-hidden bg-white/[0.04] border border-white/[0.06] flex items-center justify-center flex-shrink-0">
                  {r.avatar_url ? (
                    <img src={r.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Icon className={cn("w-4 h-4", color)} weight="fill" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-white truncate">{r.display_name}</p>
                  <p className="text-[11px] text-white/50 truncate">{r.dsrt_email}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}