'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, User, Rocket, FolderSimple, Check } from '@phosphor-icons/react'
import { useComposer, type Publisher } from './ComposerContext'

export function IdentityPicker() {
  const composer = useComposer()
  const [publishers, setPublishers] = useState<Publisher[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/home/publishers/me')
      .then(r => r.json())
      .then(d => {
        const list = (d.publishers || []) as Publisher[]
        setPublishers(list)
        // Auto-select first (self) if none selected
        if (list.length > 0 && !composer.publisher) {
          composer.setPublisher(list[0])
        }
      })
      .catch(() => setPublishers([]))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) {
    return (
      <div className="mb-5">
        <div className="text-[10.5px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
          Post as
        </div>
        <div className="flex gap-2">
          {[0, 1].map(i => (
            <div key={i} className="flex-1 h-16 rounded-lg bg-zinc-900/50 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10.5px] font-bold uppercase tracking-wider text-zinc-500">
          Post as
        </div>
        {publishers.length > 2 && (
          <div className="text-[10.5px] text-zinc-500">
            {publishers.length} identities
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {publishers.map(p => {
          const isSelected = composer.publisher?.id === p.id && composer.publisher?.type === p.type
          const IconType = p.type === 'venture' ? Rocket : p.type === 'project' ? FolderSimple : User

          return (
            <button
              key={`${p.type}-${p.id}`}
              type="button"
              onClick={() => composer.setPublisher(p)}
              className={
                'group relative flex items-center gap-3 p-3 rounded-lg border text-left transition-all ' +
                (isSelected
                  ? 'border-white/40 bg-white/[0.04] shadow-[0_0_0_1px_rgba(255,255,255,0.1)]'
                  : 'border-zinc-800 hover:border-zinc-700 bg-zinc-950/40')
              }
            >
              {/* Avatar */}
              <div className={
                'w-11 h-11 shrink-0 overflow-hidden bg-zinc-900 border border-zinc-800 flex items-center justify-center ' +
                (p.type === 'venture' || p.type === 'project' ? 'rounded-lg' : 'rounded-full')
              }>
                {p.avatar_url ? (
                  <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <IconType size={16} weight="regular" className="text-zinc-500" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-[13px] font-bold text-white truncate">
                    {p.name}
                  </span>
                  {p.is_verified && (
                    <CheckCircle size={10} weight="fill" className="text-amber-400 shrink-0" />
                  )}
                </div>
                <div className="text-[11px] text-zinc-500 truncate">
                  @{p.handle} · {p.type === 'person' ? 'Personal' : 'Venture'}
                </div>
              </div>

              {/* Check */}
              {isSelected && (
                <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center shrink-0">
                    <Check size={11} weight="bold" className="text-black" />
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}