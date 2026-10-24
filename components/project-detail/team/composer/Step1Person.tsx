'use client'

import { useState, useEffect } from 'react'
import {
  MagnifyingGlass, EnvelopeSimple, CheckCircle, ArrowRight,
  CircleNotch, WarningCircle
} from '@phosphor-icons/react'
import { DsrtAvatar } from '@/components/dsrt'
import { cn } from '@/lib/utils'
import type { InviteDraftState } from './TeamAddMemberComposer'

interface Props {
  draft: InviteDraftState
  updateDraft: (p: Partial<InviteDraftState>) => void
  onNext: () => void
}

export function Step1Person({ draft, updateDraft, onNext }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [mode, setMode] = useState<'search' | 'email'>('search')
  const [emailInput, setEmailInput] = useState(draft.email || '')

  // Debounced search
  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      setError(null)
      return
    }

    const t = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`)
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Search failed')
        setResults(json.users || [])
      } catch (e: any) {
        setError(e?.message || 'Error searching users')
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(t)
  }, [query])

  const selectUser = (u: any) => {
    updateDraft({ selectedUser: u, email: '' })
  }

  const clearSelection = () => {
    updateDraft({ selectedUser: null })
    setQuery('')
  }

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput)

  const handleEmailSubmit = () => {
    if (isValidEmail) {
      updateDraft({ email: emailInput.trim(), selectedUser: null })
      onNext()
    }
  }

  return (
    <div className="flex-1 flex flex-col animate-in slide-in-from-right-4 duration-300">
      <div className="mb-10">
        <h1 className="text-[28px] font-extrabold text-white tracking-tight mb-2">
          Who are you inviting?
        </h1>
        <p className="text-[14.5px] text-white/50">
          Find a DSRT member or invite someone outside your network.
        </p>
      </div>

      <div className="flex-1 flex flex-col">
        {/* Toggle Mode */}
        <div className="flex p-1 bg-white/[0.03] border border-white/[0.06] rounded-xl w-fit mb-8">
          <button
            onClick={() => setMode('search')}
            className={cn(
              'px-5 py-2 rounded-lg text-[13px] font-bold transition-all',
              mode === 'search' ? 'bg-white/[0.08] text-white shadow-sm' : 'text-white/40 hover:text-white/70'
            )}
          >
            Search DSRT
          </button>
          <button
            onClick={() => setMode('email')}
            className={cn(
              'px-5 py-2 rounded-lg text-[13px] font-bold transition-all',
              mode === 'email' ? 'bg-white/[0.08] text-white shadow-sm' : 'text-white/40 hover:text-white/70'
            )}
          >
            Invite via Email
          </button>
        </div>

        {mode === 'search' && (
          <div className="space-y-6">
            {draft.selectedUser ? (
              // Selected State
              <div className="bg-[#121215] border border-[#38bdf8]/30 rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[#38bdf8]/5 to-transparent pointer-events-none" />
                
                <div className="flex items-start justify-between relative z-10">
                  <div className="flex items-center gap-4">
                    <DsrtAvatar 
                      src={draft.selectedUser.avatar_url} 
                      name={draft.selectedUser.full_name || draft.selectedUser.username}
                      size="lg"
                    />
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-[18px] font-bold text-white">
                          {draft.selectedUser.full_name}
                        </h3>
                        {draft.selectedUser.is_verified && (
                          <CheckCircle size={15} weight="fill" className="text-[#38bdf8]" />
                        )}
                      </div>
                      <p className="text-[13px] font-mono text-white/50 mb-1">
                        @{draft.selectedUser.username}
                      </p>
                      {draft.selectedUser.tagline && (
                        <p className="text-[13px] text-white/70">
                          {draft.selectedUser.tagline}
                        </p>
                      )}
                    </div>
                  </div>
                  <button 
                    onClick={clearSelection}
                    className="text-[12px] font-semibold text-white/40 hover:text-red-400 transition-colors"
                  >
                    Change
                  </button>
                </div>
              </div>
            ) : (
              // Search State
              <>
                <div className="relative">
                  <MagnifyingGlass 
                    size={20} 
                    weight="bold" 
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" 
                  />
                  <input
                    autoFocus
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search by name, username, or DSRT Mail..."
                    className="w-full h-14 pl-12 pr-4 bg-white/[0.03] border border-white/[0.1] hover:border-white/[0.2] focus:border-[#38bdf8]/50 focus:bg-white/[0.05] rounded-xl text-[15px] font-medium text-white placeholder:text-white/30 outline-none transition-all shadow-inner"
                  />
                </div>

                <div className="min-h-[200px]">
                  {loading ? (
                    <div className="flex items-center gap-2 text-white/40 text-[13px] font-mono py-8 px-4">
                      <CircleNotch size={16} className="animate-spin" /> Searching network...
                    </div>
                  ) : error ? (
                    <div className="flex items-center gap-2 text-red-400 text-[13px] py-8 px-4 bg-red-500/10 rounded-xl">
                      <WarningCircle size={18} weight="fill" /> {error}
                    </div>
                  ) : query.length >= 2 && results.length === 0 ? (
                    <div className="py-12 px-4 text-center border border-dashed border-white/[0.1] rounded-xl">
                      <p className="text-[14px] font-semibold text-white/60 mb-1">No members found</p>
                      <p className="text-[13px] text-white/40 mb-4">Cannot find "{query}" in the DSRT network.</p>
                      <button onClick={() => setMode('email')} className="text-[13px] font-bold text-[#38bdf8] hover:text-white transition-colors">
                        Invite them via email instead →
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {results.map(u => (
                        <button
                          key={u.id}
                          onClick={() => selectUser(u)}
                          className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-white/[0.04] border border-transparent hover:border-white/[0.08] transition-all text-left group"
                        >
                          <DsrtAvatar src={u.avatar_url} name={u.full_name || u.username} size="md" className="shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-[14px] font-bold text-white truncate">{u.full_name}</span>
                              {u.is_verified && <CheckCircle size={13} weight="fill" className="text-[#38bdf8] shrink-0" />}
                            </div>
                            <div className="flex items-center gap-2 text-[12px] text-white/50 truncate">
                              <span className="font-mono">@{u.username}</span>
                              {u.tagline && (
                                <>
                                  <span>·</span>
                                  <span className="truncate">{u.tagline}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="w-8 h-8 rounded-full bg-white/[0.04] flex items-center justify-center text-white/0 group-hover:text-white/60 group-hover:bg-white/[0.08] transition-all">
                            <ArrowRight size={14} weight="bold" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {mode === 'email' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="bg-[#121215] border border-white/[0.06] rounded-2xl p-6 sm:p-8">
              <div className="w-12 h-12 bg-white/[0.04] border border-white/[0.08] rounded-xl flex items-center justify-center mb-5">
                <EnvelopeSimple size={24} weight="fill" className="text-white/60" />
              </div>
              <h3 className="text-[18px] font-bold text-white mb-2">Invite via Email</h3>
              <p className="text-[14px] text-white/50 leading-relaxed mb-6 max-w-md">
                Enter their email address. They will receive a secure link to review the role, work plan, and permissions. Their DSRT identity will be created automatically upon acceptance.
              </p>
              
              <div className="relative max-w-md">
                <input
                  autoFocus
                  type="email"
                  value={emailInput}
                  onChange={e => setEmailInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && isValidEmail && handleEmailSubmit()}
                  placeholder="colleague@example.com"
                  className="w-full h-12 px-4 bg-white/[0.03] border border-white/[0.1] rounded-xl text-[14.5px] font-medium text-white placeholder:text-white/30 outline-none focus:border-[#38bdf8]/50 focus:bg-white/[0.05] transition-all"
                />
              </div>
            </div>
          </div>
        )}

        {/* Navigation Footer */}
        <div className="mt-auto pt-6 border-t border-white/[0.06] flex items-center justify-end">
          {mode === 'search' && draft.selectedUser ? (
            <button
              onClick={onNext}
              className="h-11 px-6 rounded-xl bg-white text-black font-bold text-[14px] flex items-center gap-2 hover:bg-white/90 transition-transform active:scale-95"
            >
              Next: Define Role <ArrowRight size={16} weight="bold" />
            </button>
          ) : mode === 'email' && isValidEmail ? (
            <button
              onClick={handleEmailSubmit}
              className="h-11 px-6 rounded-xl bg-white text-black font-bold text-[14px] flex items-center gap-2 hover:bg-white/90 transition-transform active:scale-95"
            >
              Next: Define Role <ArrowRight size={16} weight="bold" />
            </button>
          ) : (
            <button disabled className="h-11 px-6 rounded-xl bg-white/[0.04] text-white/30 font-bold text-[14px] flex items-center gap-2 cursor-not-allowed">
              Next: Define Role <ArrowRight size={16} weight="bold" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}