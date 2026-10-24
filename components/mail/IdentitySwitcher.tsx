'use client'

import { useState, useRef, useEffect } from 'react'
import { CaretDown, User, Rocket, Buildings, Check, Stack, Gear } from '@phosphor-icons/react'
import { useMailIdentity, MailIdentity } from './hooks/useMailIdentity'
import { cn } from '@/lib/utils'

const ENTITY_META = {
  user: { icon: User, label: 'Personal', color: 'text-blue-400' },
  venture: { icon: Buildings, label: 'Venture', color: 'text-violet-400' },
  project: { icon: Rocket, label: 'Project', color: 'text-emerald-400' },
}

export function IdentitySwitcher() {
  const { identities, activeIdentity, isUnified, setActiveIdentity } = useMailIdentity()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (!activeIdentity) {
    return (
      <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] animate-pulse h-[80px]" />
    )
  }

  const grouped = {
    user: identities.filter(i => i.entity_type === 'user'),
    venture: identities.filter(i => i.entity_type === 'venture'),
    project: identities.filter(i => i.entity_type === 'project'),
  }

  const renderIdentityChip = (identity: MailIdentity | 'unified', isActive: boolean) => {
    if (identity === 'unified') {
      return (
        <button
          onClick={() => { setActiveIdentity('unified'); setOpen(false) }}
          className={cn(
            "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors",
            isActive ? "bg-white/[0.08]" : "hover:bg-white/[0.04]"
          )}
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/20 to-blue-500/20 border border-white/[0.08] flex items-center justify-center">
            <Stack className="w-4 h-4 text-white/80" weight="fill" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12.5px] font-bold text-white">Unified Inbox</p>
            <p className="text-[10.5px] text-white/50">All identities</p>
          </div>
          {isActive && <Check className="w-3.5 h-3.5 text-white" weight="bold" />}
        </button>
      )
    }

    const meta = ENTITY_META[identity.entity_type]
    const Icon = meta.icon
    return (
      <button
        key={identity.identity_id}
        onClick={() => { setActiveIdentity(identity); setOpen(false) }}
        className={cn(
          "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors",
          isActive ? "bg-white/[0.08]" : "hover:bg-white/[0.04]"
        )}
      >
        <div className="w-8 h-8 rounded-lg overflow-hidden bg-white/[0.04] border border-white/[0.08] flex items-center justify-center flex-shrink-0">
          {identity.avatar_url ? (
            <img src={identity.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <Icon className={cn("w-4 h-4", meta.color)} weight="fill" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12.5px] font-bold text-white truncate">{identity.display_name}</p>
          <p className="text-[10.5px] text-white/50 truncate">{identity.dsrt_email}</p>
        </div>
        {isActive && <Check className="w-3.5 h-3.5 text-white" weight="bold" />}
      </button>
    )
  }

  // Active display
  const activeMeta = !isUnified && typeof activeIdentity === 'object'
    ? ENTITY_META[activeIdentity.entity_type]
    : null

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full flex items-center gap-2.5 p-3 rounded-xl transition-colors",
          "bg-gradient-to-b from-white/[0.04] to-white/[0.02] border border-white/[0.08]",
          "hover:from-white/[0.06] hover:to-white/[0.03]"
        )}
      >
        <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/[0.04] border border-white/[0.08] flex items-center justify-center flex-shrink-0">
          {isUnified ? (
            <div className="w-full h-full bg-gradient-to-br from-violet-500/30 to-blue-500/30 flex items-center justify-center">
              <Stack className="w-5 h-5 text-white/90" weight="fill" />
            </div>
          ) : typeof activeIdentity === 'object' && activeIdentity.avatar_url ? (
            <img src={activeIdentity.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : activeMeta ? (
            <activeMeta.icon className={cn("w-5 h-5", activeMeta.color)} weight="fill" />
          ) : null}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-[9px] uppercase tracking-wider font-bold text-white/40 mb-0.5">Viewing as</p>
          <p className="text-[13px] font-bold text-white truncate leading-tight">
            {isUnified ? 'Unified Inbox' : (typeof activeIdentity === 'object' ? activeIdentity.display_name : '')}
          </p>
          <p className="text-[10.5px] text-white/50 truncate">
            {isUnified ? `${identities.length} identities` : (typeof activeIdentity === 'object' ? activeIdentity.dsrt_email : '')}
          </p>
        </div>
        <CaretDown className={cn("w-3 h-3 text-white/50 transition-transform", open && "rotate-180")} weight="bold" />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 rounded-xl bg-gradient-to-b from-[#131318] to-[#0a0a0f] border border-white/[0.1] shadow-2xl overflow-hidden">
          {/* Unified */}
          <div className="p-2 border-b border-white/[0.06]">
            {renderIdentityChip('unified', isUnified)}
          </div>

          {/* Personal */}
          {grouped.user.length > 0 && (
            <div className="p-2">
              <p className="text-[9.5px] uppercase tracking-wider font-bold text-white/40 px-2 py-1">Personal</p>
              {grouped.user.map(i => renderIdentityChip(i, !isUnified && typeof activeIdentity === 'object' && activeIdentity.identity_id === i.identity_id))}
            </div>
          )}

          {/* Ventures */}
          {grouped.venture.length > 0 && (
            <div className="p-2 border-t border-white/[0.06]">
              <p className="text-[9.5px] uppercase tracking-wider font-bold text-white/40 px-2 py-1">Ventures</p>
              {grouped.venture.map(i => renderIdentityChip(i, !isUnified && typeof activeIdentity === 'object' && activeIdentity.identity_id === i.identity_id))}
            </div>
          )}

          {/* Projects */}
          {grouped.project.length > 0 && (
            <div className="p-2 border-t border-white/[0.06]">
              <p className="text-[9.5px] uppercase tracking-wider font-bold text-white/40 px-2 py-1">Projects</p>
              {grouped.project.map(i => renderIdentityChip(i, !isUnified && typeof activeIdentity === 'object' && activeIdentity.identity_id === i.identity_id))}
            </div>
          )}

          {/* Manage */}
          <div className="p-2 border-t border-white/[0.06]">
            <button
              onClick={() => { setOpen(false); window.location.href = '/settings/mail-identities' }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/[0.04] text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                <Gear className="w-3.5 h-3.5 text-white/60" />
              </div>
              <p className="text-[12px] font-semibold text-white/80">Manage Identities</p>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}