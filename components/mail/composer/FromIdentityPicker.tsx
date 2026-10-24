'use client'

import { useState, useRef, useEffect } from 'react'
import { CaretDown, User, Rocket, Buildings, Check } from '@phosphor-icons/react'
import { useMailIdentity, MailIdentity } from '../hooks/useMailIdentity'
import { cn } from '@/lib/utils'

const ENTITY_META = {
  user: { icon: User, color: 'text-blue-400' },
  venture: { icon: Buildings, color: 'text-violet-400' },
  project: { icon: Rocket, color: 'text-emerald-400' },
}

interface Props {
  value: string | null
  onChange: (identityId: string) => void
}

export function FromIdentityPicker({ value, onChange }: Props) {
  const { identities } = useMailIdentity()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selected = identities.find(i => i.identity_id === value)
  const meta = selected ? ENTITY_META[selected.entity_type] : ENTITY_META.user
  const Icon = meta.icon

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 h-11 px-3 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] transition-colors text-left"
      >
        <div className="w-7 h-7 rounded-md overflow-hidden bg-white/[0.04] border border-white/[0.06] flex items-center justify-center flex-shrink-0">
          {selected?.avatar_url ? (
            <img src={selected.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <Icon className={cn("w-3.5 h-3.5", meta.color)} weight="fill" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12.5px] font-bold text-white truncate leading-tight">
            {selected?.display_name || 'Select identity'}
          </p>
          <p className="text-[10.5px] text-white/50 truncate">
            {selected?.dsrt_email || ''}
          </p>
        </div>
        <CaretDown className={cn("w-3 h-3 text-white/50 transition-transform", open && "rotate-180")} weight="bold" />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl bg-gradient-to-b from-[#141419] to-[#0a0a0f] border border-white/[0.1] shadow-2xl max-h-[300px] overflow-y-auto">
          <div className="p-1.5">
            <p className="text-[9.5px] uppercase tracking-wider font-bold text-white/40 px-3 py-1.5">Send As</p>
            {identities.map(id => {
              const im = ENTITY_META[id.entity_type]
              const IIcon = im.icon
              const isSelected = value === id.identity_id
              return (
                <button
                  key={id.identity_id}
                  type="button"
                  onClick={() => { onChange(id.identity_id); setOpen(false) }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors",
                    isSelected ? "bg-white/[0.08]" : "hover:bg-white/[0.04]"
                  )}
                >
                  <div className="w-7 h-7 rounded-md overflow-hidden bg-white/[0.04] border border-white/[0.06] flex items-center justify-center flex-shrink-0">
                    {id.avatar_url ? (
                      <img src={id.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <IIcon className={cn("w-3.5 h-3.5", im.color)} weight="fill" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold text-white truncate">{id.display_name}</p>
                    <p className="text-[10.5px] text-white/50 truncate">{id.dsrt_email}</p>
                  </div>
                  {isSelected && <Check className="w-3 h-3 text-white" weight="bold" />}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}