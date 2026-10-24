'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  X, MagnifyingGlass, User, EnvelopeSimple, CheckCircle, ArrowRight,
  CircleNotch, WarningCircle, UserPlus, Sparkle, Target, ShieldCheck
} from '@phosphor-icons/react'
import { DsrtAvatar } from '@/components/dsrt'
import { cn } from '@/lib/utils'
import type { AccessPermissions } from '@/types/team'

// ═══════════════════════════════════════════════════════════════════════════
// TYPES & FOUNDATION STATE
// ═══════════════════════════════════════════════════════════════════════════

interface Props {
  slug: string
  projectId: string
  onClose: () => void
  onSuccess?: () => void
}

/** 
 * Master state object that will be built up across the 6 steps.
 * This ensures the final API call has everything perfectly structured.
 */
export interface InviteDraftState {
  // Step 1: Person
  selectedUser: any | null
  email: string
  // Step 2: Role
  roleTitle: string
  department: string
  seniority: string
  reportsToId: string | null
  isLead: boolean
  // Step 3: Contribution
  primaryContribution: string
  skills: string[]
  responsibilities: string[]
  // Step 4: Work Plan
  startDate: string
  commitmentHours: number | null
  workingModel: string
  objectives: Array<{ title: string; priority: string; dueDate: string | null }>
  // Step 5: Access
  permissions: AccessPermissions
}

const INITIAL_DRAFT: InviteDraftState = {
  selectedUser: null,
  email: '',
  roleTitle: '',
  department: '',
  seniority: '',
  reportsToId: null,
  isLead: false,
  primaryContribution: '',
  skills: [],
  responsibilities: [],
  startDate: '',
  commitmentHours: null,
  workingModel: 'flexible',
  objectives: [],
  permissions: {
    project: { view: true, edit: false, delete: false },
    team: { view: true, invite: false, remove: false, manage_permissions: false },
    projects: { view: true, create: false, edit: false, archive: false },
    financial: { view: false, manage: false },
    research: { view: false, create: false, edit: false },
    mail: { use: true, team_comm: true },
    analytics: { view: false, export: false },
  }
}

const STEPS = [
  { id: 1, label: 'Person',       desc: 'Who are you inviting?', icon: UserPlus },
  { id: 2, label: 'Role',         desc: 'Define their position', icon: User },
  { id: 3, label: 'Contribution', desc: 'Skills & responsibilities', icon: Sparkle },
  { id: 4, label: 'Work Plan',    desc: 'Commitment & objectives', icon: Target },
  { id: 5, label: 'Access',       desc: 'Permission matrix', icon: ShieldCheck },
  { id: 6, label: 'Review',       desc: 'Send invitation', icon: EnvelopeSimple },
]

// ═══════════════════════════════════════════════════════════════════════════
// SHELL COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function TeamAddMemberComposer({ slug, projectId, onClose, onSuccess }: Props) {
  const [mounted, setMounted] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [draft, setDraft] = useState<InviteDraftState>(INITIAL_DRAFT)

  // Body scroll lock
  useEffect(() => {
    setMounted(true)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // ESC to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const updateDraft = (patch: Partial<InviteDraftState>) => {
    setDraft(prev => ({ ...prev, ...patch }))
  }

  const handleNext = () => setCurrentStep(p => Math.min(6, p + 1))
  const handlePrev = () => setCurrentStep(p => Math.max(1, p - 1))

  if (!mounted) return null

  const content = (
    <div className="fixed inset-0 z-[200] bg-[#05070D] flex flex-col animate-in fade-in duration-200">
      
      {/* ─── HEADER ─────────────────────────────────────────────────────── */}
      <header className="h-[64px] flex items-center justify-between px-6 border-b border-white/[0.06] bg-[#0a0a0f] flex-shrink-0">
        <div>
          <h2 className="text-[14px] font-bold tracking-widest uppercase text-white font-mono">
            Add Team Member
          </h2>
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors"
          aria-label="Close composer"
        >
          <X size={20} weight="bold" />
        </button>
      </header>

      {/* ─── BODY (2-pane) ────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Rail: Stepper */}
        <aside className="w-[280px] bg-[#05070D] border-r border-white/[0.06] flex-shrink-0 hidden md:flex flex-col p-6">
          <div className="space-y-6">
            {STEPS.map((step) => {
              const isActive = currentStep === step.id
              const isPast = currentStep > step.id
              const Icon = step.icon

              return (
                <div key={step.id} className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold border transition-colors duration-300',
                      isActive ? 'bg-[#38bdf8]/10 border-[#38bdf8]/40 text-[#38bdf8]' :
                      isPast   ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                                 'bg-white/[0.02] border-white/[0.06] text-white/30'
                    )}>
                      {isPast ? <CheckCircle size={16} weight="fill" /> : `0${step.id}`}
                    </div>
                    {step.id !== 6 && (
                      <div className={cn(
                        'w-px h-8 mt-2 transition-colors duration-300',
                        isPast ? 'bg-emerald-500/30' : 'bg-white/[0.06]'
                      )} />
                    )}
                  </div>
                  <div className="pt-1.5">
                    <p className={cn(
                      'text-[14px] font-bold leading-none mb-1 transition-colors',
                      isActive ? 'text-white' : isPast ? 'text-white/80' : 'text-white/40'
                    )}>
                      {step.label}
                    </p>
                    <p className={cn(
                      'text-[12px] transition-colors',
                      isActive ? 'text-white/60' : 'text-white/30'
                    )}>
                      {step.desc}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </aside>

        {/* Right Pane: Active Step Content */}
        <main className="flex-1 overflow-y-auto bg-[#0a0a0f] p-6 md:p-12 relative flex flex-col">
          <div className="max-w-[720px] w-full mx-auto flex-1 flex flex-col">
            
            {/* STEP ROUTER */}
            {currentStep === 1 && (
              <Step1Person draft={draft} updateDraft={updateDraft} onNext={handleNext} />
            )}
            {currentStep === 2 && (
              <PlaceholderStep title="Define Role" onPrev={handlePrev} onNext={handleNext} />
            )}
            {currentStep === 3 && (
              <PlaceholderStep title="Contribution Profile" onPrev={handlePrev} onNext={handleNext} />
            )}
            {currentStep === 4 && (
              <PlaceholderStep title="Work Plan" onPrev={handlePrev} onNext={handleNext} />
            )}
            {currentStep === 5 && (
              <PlaceholderStep title="Access Matrix" onPrev={handlePrev} onNext={handleNext} />
            )}
            {currentStep === 6 && (
              <PlaceholderStep title="Review & Invite" onPrev={handlePrev} />
            )}

          </div>
        </main>
      </div>
    </div>
  )

  return createPortal(content, document.body)
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 1: FIND PERSON
// ═══════════════════════════════════════════════════════════════════════════

function Step1Person({
  draft,
  updateDraft,
  onNext
}: {
  draft: InviteDraftState
  updateDraft: (p: Partial<InviteDraftState>) => void
  onNext: () => void
}) {
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

// Temporary placeholder for upcoming steps
function PlaceholderStep({ title, onPrev, onNext }: { title: string, onPrev: () => void, onNext?: () => void }) {
  return (
    <div className="flex-1 flex flex-col animate-in slide-in-from-right-4 duration-300">
      <div className="mb-10">
        <h1 className="text-[28px] font-extrabold text-white tracking-tight mb-2">
          {title}
        </h1>
        <p className="text-[14.5px] text-white/50">
          This step is coming in the next phase.
        </p>
      </div>
      <div className="flex-1 flex items-center justify-center border border-dashed border-white/[0.1] rounded-2xl bg-white/[0.01]">
        <p className="text-white/40 font-mono text-[12px] uppercase tracking-widest">{title} Component</p>
      </div>
      <div className="mt-auto pt-6 border-t border-white/[0.06] flex items-center justify-between">
        <button onClick={onPrev} className="h-11 px-6 rounded-xl bg-white/[0.06] text-white font-bold text-[14px] hover:bg-white/[0.1]">
          Back
        </button>
        {onNext ? (
          <button onClick={onNext} className="h-11 px-6 rounded-xl bg-white text-black font-bold text-[14px] hover:bg-white/90">
            Next Step
          </button>
        ) : (
          <button className="h-11 px-6 rounded-xl bg-[#38bdf8] text-black font-extrabold text-[14px] hover:bg-[#38bdf8]/90 shadow-[0_0_20px_rgba(56,189,248,0.3)]">
            Review & Send Invitation
          </button>
        )}
      </div>
    </div>
  )
}