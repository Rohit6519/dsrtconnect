'use client'

import { useState, useRef, useEffect } from 'react'
import { 
  User, Rocket, Buildings, Check, Stack, Gear, 
  Plus, SignOut, CaretDown, EnvelopeSimple, Crown
} from '@phosphor-icons/react'
import { useMailIdentity, MailIdentity } from './hooks/useMailIdentity'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

const ENTITY_META = {
  user: { 
    icon: User, 
    color: 'text-blue-400', 
    bgColor: 'bg-blue-500/10', 
    borderColor: 'border-blue-500/20',
    label: 'Personal'
  },
  venture: { 
    icon: Buildings, 
    color: 'text-violet-400', 
    bgColor: 'bg-violet-500/10', 
    borderColor: 'border-violet-500/20',
    label: 'Venture'
  },
  project: { 
    icon: Rocket, 
    color: 'text-emerald-400', 
    bgColor: 'bg-emerald-500/10', 
    borderColor: 'border-emerald-500/20',
    label: 'Project'
  },
}

export function AccountSwitcher() {
  const { 
    identities, activeIdentity, isUnified, loading, 
    setActiveIdentity, totalUnread, refresh 
  } = useMailIdentity()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Close on ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  // Loading state
  if (loading) {
    return (
      <div className="w-9 h-9 rounded-full bg-white/[0.05] border border-white/[0.08] animate-pulse" />
    )
  }

  // Error state — no identities loaded
  if (identities.length === 0) {
    return (
      <button
        onClick={() => refresh()}
        className="w-9 h-9 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 hover:bg-red-500/20"
        title="Reload identities"
      >
        <Plus className="w-4 h-4" weight="bold" />
      </button>
    )
  }

  const activeMeta = !isUnified && typeof activeIdentity === 'object' && activeIdentity !== null
    ? ENTITY_META[activeIdentity.entity_type]
    : null

  // Group identities by type
  const grouped = {
    user: identities.filter(i => i.entity_type === 'user'),
    venture: identities.filter(i => i.entity_type === 'venture'),
    project: identities.filter(i => i.entity_type === 'project'),
  }

  const handleSelect = (identity: MailIdentity | 'unified') => {
    setActiveIdentity(identity)
    setOpen(false)
    
    if (identity === 'unified') {
      toast.success('Switched to Unified Inbox')
    } else {
      toast.success(`Now acting as ${identity.display_name}`, {
        description: identity.dsrt_email,
      })
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const renderIdentityRow = (identity: MailIdentity, isActive: boolean) => {
    const meta = ENTITY_META[identity.entity_type]
    const Icon = meta.icon
    const unread = identity.unread_count || 0

    return (
      <button
        key={identity.identity_id}
        onClick={() => handleSelect(identity)}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left group",
          isActive 
            ? "bg-white/[0.08]" 
            : "hover:bg-white/[0.04]"
        )}
      >
        <div className={cn(
          "w-9 h-9 rounded-full overflow-hidden border flex items-center justify-center flex-shrink-0",
          isActive ? "border-white/[0.15]" : "border-white/[0.08]"
        )}>
          {identity.avatar_url ? (
            <img 
              src={identity.avatar_url} 
              alt="" 
              className="w-full h-full object-cover" 
            />
          ) : (
            <div className={cn("w-full h-full flex items-center justify-center", meta.bgColor)}>
              <Icon className={cn("w-4 h-4", meta.color)} weight="fill" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-[12.5px] font-bold text-white truncate">
              {identity.display_name}
            </p>
            {identity.role === 'founder' && (
              <Crown className="w-2.5 h-2.5 text-amber-400 flex-shrink-0" weight="fill" />
            )}
          </div>
          <p className="text-[10.5px] text-white/50 truncate font-mono">
            {identity.dsrt_email}
          </p>
        </div>

        {unread > 0 && !isActive && (
          <span className="text-[9.5px] font-bold px-1.5 h-4 min-w-[16px] flex items-center justify-center rounded bg-white/[0.08] text-white/75">
            {unread > 99 ? '99+' : unread}
          </span>
        )}

        {isActive && (
          <Check className="w-4 h-4 text-white flex-shrink-0" weight="bold" />
        )}
      </button>
    )
  }

  return (
    <div ref={ref} className="relative">
      {/* Trigger — circular avatar with unread ring */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'relative w-10 h-10 rounded-full transition-all flex items-center justify-center',
          open ? 'ring-2 ring-white/15' : 'hover:ring-1 hover:ring-white/20'
        )}
        title={isUnified ? 'Unified Inbox' : (typeof activeIdentity === 'object' ? activeIdentity?.display_name : '')}
      >
        {/* Avatar surface (clips image only) */}
        <span className="w-9 h-9 rounded-full overflow-hidden border border-white/[0.15] flex items-center justify-center">
          {isUnified ? (
            <span className="w-full h-full bg-gradient-to-br from-white/15 to-white/5 flex items-center justify-center">
              <Stack className="w-4 h-4 text-white" weight="fill" />
            </span>
          ) : typeof activeIdentity === 'object' && activeIdentity?.avatar_url ? (
            <img
              src={activeIdentity.avatar_url}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : activeMeta ? (
            <span className={cn('w-full h-full flex items-center justify-center', activeMeta.bgColor)}>
              <activeMeta.icon className={cn('w-4 h-4', activeMeta.color)} weight="fill" />
            </span>
          ) : (
            <span className="w-full h-full bg-white/[0.06] flex items-center justify-center">
              <User className="w-4 h-4 text-white/60" weight="fill" />
            </span>
          )}
        </span>

        {/* Badge OUTSIDE overflow clip */}
        {totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 z-10 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 border-2 border-[#0a0a0f] flex items-center justify-center shadow-sm">
            <span className="text-[9px] font-bold text-white leading-none">
              {totalUnread > 9 ? '9+' : totalUnread}
            </span>
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className={cn(
          "absolute top-full right-0 mt-2 w-[360px] z-[100] rounded-2xl overflow-hidden",
          "bg-gradient-to-b from-[#131318] to-[#0a0a0f]",
          "border border-white/[0.1]",
          "shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
        )}>
          {/* Active identity header */}
          <div className="p-5 border-b border-white/[0.06] bg-gradient-to-b from-white/[0.04] to-transparent">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full overflow-hidden border border-white/[0.12] flex items-center justify-center flex-shrink-0">
                {isUnified ? (
                  <div className="w-full h-full bg-gradient-to-br from-violet-500/40 to-blue-500/40 flex items-center justify-center">
                    <Stack className="w-6 h-6 text-white" weight="fill" />
                  </div>
                ) : typeof activeIdentity === 'object' && activeIdentity?.avatar_url ? (
                  <img src={activeIdentity.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : activeMeta ? (
                  <div className={cn("w-full h-full flex items-center justify-center", activeMeta.bgColor)}>
                    <activeMeta.icon className={cn("w-6 h-6", activeMeta.color)} weight="fill" />
                  </div>
                ) : null}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9.5px] uppercase tracking-[0.14em] font-bold text-white/40 mb-1">
                  Signed in as
                </p>
                <p className="text-[15px] font-bold text-white truncate leading-tight">
                  {isUnified 
                    ? 'Unified Inbox' 
                    : (typeof activeIdentity === 'object' ? activeIdentity?.display_name : 'Unknown')
                  }
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <EnvelopeSimple className="w-3 h-3 text-white/40" />
                  <p className="text-[11px] text-white/55 truncate font-mono">
                    {isUnified 
                      ? `${identities.length} identities` 
                      : (typeof activeIdentity === 'object' ? activeIdentity?.dsrt_email : '')
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Scrollable identity list */}
          <div className="max-h-[420px] overflow-y-auto p-2">
            {/* Unified Inbox */}
            <button
              onClick={() => handleSelect('unified')}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left mb-1",
                isUnified ? "bg-white/[0.08]" : "hover:bg-white/[0.04]"
              )}
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500/25 to-blue-500/25 border border-white/[0.08] flex items-center justify-center flex-shrink-0">
                <Stack className="w-4 h-4 text-white/80" weight="fill" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-bold text-white">Unified Inbox</p>
                <p className="text-[10.5px] text-white/50">
                  All {identities.length} identit{identities.length === 1 ? 'y' : 'ies'}
                </p>
              </div>
              {totalUnread > 0 && !isUnified && (
                <span className="text-[9.5px] font-bold px-1.5 h-4 min-w-[16px] flex items-center justify-center rounded bg-white/[0.08] text-white/75">
                  {totalUnread > 99 ? '99+' : totalUnread}
                </span>
              )}
              {isUnified && <Check className="w-4 h-4 text-white" weight="bold" />}
            </button>

            {/* Personal Identities */}
            {grouped.user.length > 0 && (
              <div className="mt-2">
                <p className="text-[9px] uppercase tracking-[0.14em] font-bold text-white/40 px-3 py-1.5">
                  Personal
                </p>
                {grouped.user.map(i => renderIdentityRow(
                  i, 
                  !isUnified && typeof activeIdentity === 'object' && activeIdentity?.identity_id === i.identity_id
                ))}
              </div>
            )}

            {/* Ventures */}
            {grouped.venture.length > 0 && (
              <div className="mt-2">
                <div className="flex items-center justify-between px-3 py-1.5">
                  <p className="text-[9px] uppercase tracking-[0.14em] font-bold text-white/40">
                    Ventures
                  </p>
                  <span className="text-[9px] font-bold text-white/30">
                    {grouped.venture.length}
                  </span>
                </div>
                {grouped.venture.map(i => renderIdentityRow(
                  i, 
                  !isUnified && typeof activeIdentity === 'object' && activeIdentity?.identity_id === i.identity_id
                ))}
              </div>
            )}

            {/* Projects */}
            {grouped.project.length > 0 && (
              <div className="mt-2">
                <div className="flex items-center justify-between px-3 py-1.5">
                  <p className="text-[9px] uppercase tracking-[0.14em] font-bold text-white/40">
                    Projects
                  </p>
                  <span className="text-[9px] font-bold text-white/30">
                    {grouped.project.length}
                  </span>
                </div>
                {grouped.project.map(i => renderIdentityRow(
                  i, 
                  !isUnified && typeof activeIdentity === 'object' && activeIdentity?.identity_id === i.identity_id
                ))}
              </div>
            )}

            {/* Empty state for no ventures/projects */}
            {grouped.venture.length === 0 && grouped.project.length === 0 && (
              <div className="mt-3 mx-2 p-3 rounded-lg bg-white/[0.02] border border-white/[0.05] text-center">
                <p className="text-[11px] text-white/45 leading-relaxed">
                  Create a project or venture to get its own mail identity.
                </p>
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div className="border-t border-white/[0.06] p-2 flex gap-1">
            <Link
              href="/inbox/settings"
              onClick={() => setOpen(false)}
              className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/[0.04] transition-colors text-left"
            >
              <Gear className="w-3.5 h-3.5 text-white/60" />
              <span className="text-[11.5px] font-semibold text-white/80">Manage identities</span>
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-500/10 transition-colors"
              title="Sign out"
            >
              <SignOut className="w-3.5 h-3.5 text-white/60 hover:text-red-400" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}