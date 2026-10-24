'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  CheckCircle, WarningCircle, CircleNotch, Briefcase, Code,
  Target, ShieldCheck, EnvelopeSimple, ArrowRight, X, Check
} from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import { DsrtAvatar, DsrtPanel, DsrtButton } from '@/components/dsrt'
import { cn } from '@/lib/utils'

type LoadState =
  | { status: 'loading' }
  | { status: 'ok'; data: any }
  | { status: 'error'; message: string; code?: string; projectSlug?: string }
  | { status: 'relogin_required'; data: any }

const PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
  low:      { label: 'Low',      color: 'text-zinc-400' },
  normal:   { label: 'Normal',   color: 'text-blue-400' },
  high:     { label: 'High',     color: 'text-orange-400' },
  critical: { label: 'Critical', color: 'text-red-400' },
}

const WORKING_MODEL_LABELS: Record<string, string> = {
  flexible:      'Flexible',
  part_time:     'Part-time',
  full_time:     'Full-time',
  project_based: 'Project-based',
}

const SENIORITY_LABELS: Record<string, string> = {
  intern: 'Intern', junior: 'Junior', mid: 'Mid-Level', senior: 'Senior',
  lead: 'Lead', principal: 'Principal', staff: 'Staff', executive: 'Executive', advisor: 'Advisor',
}

function formatDate(d: string | null): string {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('en', { month: 'long', day: 'numeric', year: 'numeric' }) }
  catch { return d }
}

function countPermissions(perms: any): { granted: number; total: number } {
  let granted = 0; let total = 0
  if (!perms || typeof perms !== 'object') return { granted, total }
  for (const cat of Object.values(perms)) {
    if (!cat || typeof cat !== 'object') continue
    for (const val of Object.values(cat)) {
      total++
      if (val) granted++
    }
  }
  return { granted, total }
}

export function InvitationReviewClient({ token }: { token: string }) {
  const router = useRouter()
  const supabase = createClient()

  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' })
  const [processing, setProcessing] = useState<'accept' | 'decline' | null>(null)
  
  const isMountedRef = useRef(true)

  const fetchInvite = useCallback(async () => {
    try {
      const res = await fetch(`/api/team-invitations/${token}`, { cache: 'no-store' })
      const json = await res.json().catch(() => ({}))
      
      if (!isMountedRef.current) return

      if (!res.ok) {
        setLoadState({ 
          status: 'error', 
          message: json?.error || 'Failed to load invitation',
          code: json?.code,
          projectSlug: json?.project_slug
        })
        return
      }

      if (json.invitation?.requires_relogin) {
        setLoadState({ status: 'relogin_required', data: json.invitation })
        return
      }

      setLoadState({ status: 'ok', data: json.invitation })
    } catch (e: any) {
      if (isMountedRef.current) {
        setLoadState({ status: 'error', message: e?.message || 'Network error' })
      }
    }
  }, [token])

  useEffect(() => {
    isMountedRef.current = true
    fetchInvite()
    return () => { isMountedRef.current = false }
  }, [fetchInvite])

  const handleAction = async (action: 'accept' | 'decline') => {
    if (processing || loadState.status !== 'ok') return
    const invite = loadState.data

    if (action === 'accept' && !invite.is_authenticated) {
      sessionStorage.setItem('dsrt_pending_invitation', token)
      
      let authUrl = `/signup?redirect=/team-invitations/${token}`
      if (invite.invited_email) {
        authUrl += `&email=${encodeURIComponent(invite.invited_email)}`
      }
      
      toast.info('Please create an account or sign in to accept this invitation')
      router.push(authUrl)
      return
    }

    setProcessing(action)

    try {
      const res = await fetch(`/api/team-invitations/${token}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })
      const json = await res.json().catch(() => ({}))
      
      if (!res.ok) throw new Error(json?.error || `Failed to ${action}`)

      if (action === 'decline') {
        toast.success('Invitation declined')
        setLoadState({ status: 'error', message: 'You have declined this invitation', code: 'declined' })
      } else {
        toast.success('Invitation accepted!')
        router.replace(`/projects/${invite.project.slug}/team/onboarding`)
      }
    } catch (e: any) {
      toast.error(e?.message || `Failed to ${action} invitation`)
      if (isMountedRef.current) setProcessing(null)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.refresh()
    fetchInvite()
  }

  if (loadState.status === 'loading') {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4">
        <CircleNotch size={24} className="animate-spin text-white/30" />
        <span className="text-[13px] font-mono uppercase tracking-wider text-white/40 font-bold">
          Loading Invitation
        </span>
      </div>
    )
  }

  if (loadState.status === 'relogin_required') {
    const data = loadState.data
    return (
      <div className="max-w-md mx-auto animate-in fade-in duration-500">
        <DsrtPanel padding="lg" variant="default" className="text-center overflow-hidden">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 mx-auto flex items-center justify-center mb-5">
            <WarningCircle size={28} weight="fill" className="text-amber-400" />
          </div>
          <h1 className="text-[20px] font-extrabold text-white mb-2 tracking-tight">Account Mismatch</h1>
          <p className="text-[14px] text-white/60 leading-relaxed mb-8">
            This invitation was sent to <strong className="text-white">{data.invited_email || 'another user'}</strong>, but you are currently signed in as <strong className="text-white">{data.current_user_email}</strong>.
          </p>
          <div className="space-y-3">
            <DsrtButton variant="primary" fullWidth onClick={handleLogout}>
              Sign out and switch accounts
            </DsrtButton>
            <DsrtButton variant="ghost" fullWidth onClick={() => router.push('/home')}>
              Return to Home
            </DsrtButton>
          </div>
        </DsrtPanel>
      </div>
    )
  }

  if (loadState.status === 'error') {
    const isAccepted = loadState.code === 'accepted'
    const isDeclined = loadState.code === 'declined'

    return (
      <div className="max-w-md mx-auto animate-in fade-in duration-500">
        <DsrtPanel padding="lg" variant="default" className="text-center overflow-hidden relative">
          <div className={cn(
            "absolute top-0 left-0 right-0 h-1",
            isAccepted ? "bg-emerald-500" : isDeclined ? "bg-zinc-500" : "bg-red-500"
          )} />

          <div className={cn(
            "w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-5 border",
            isAccepted ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : 
            isDeclined ? "bg-white/[0.04] border-white/[0.08] text-white/40" : 
            "bg-red-500/10 border-red-500/20 text-red-400"
          )}>
            {isAccepted ? <CheckCircle size={32} weight="fill" /> : 
             isDeclined ? <X size={32} weight="bold" /> : 
             <WarningCircle size={32} weight="fill" />}
          </div>
          
          <h1 className="text-[20px] font-extrabold text-white mb-2 tracking-tight">
            {isAccepted ? 'Already Accepted' : isDeclined ? 'Invitation Declined' : 'Invalid Link'}
          </h1>
          
          <p className="text-[14px] text-white/60 leading-relaxed mb-8">
            {loadState.message}
          </p>

          {isAccepted && loadState.projectSlug ? (
            <DsrtButton variant="primary" fullWidth onClick={() => router.push(`/projects/${loadState.projectSlug}`)}>
              Go to Project Workspace <ArrowRight size={14} weight="bold" className="ml-1" />
            </DsrtButton>
          ) : (
            <DsrtButton variant="outline" fullWidth onClick={() => router.push('/projects')}>
              Browse other projects
            </DsrtButton>
          )}
        </DsrtPanel>
      </div>
    )
  }

  const invite = loadState.data
  const snap = invite.snapshot || {}
  const proj = invite.project || {}
  const inviter = invite.inviter || {}

  const resps = Array.isArray(snap.responsibilities) ? snap.responsibilities : []
  const objs = Array.isArray(snap.work_plan?.objectives) ? snap.work_plan.objectives : []
  const skills = Array.isArray(snap.skills) ? snap.skills : []
  const perms = countPermissions(snap.permissions)

  return (
    <div className="max-w-[720px] mx-auto animate-in slide-in-from-bottom-8 fade-in duration-500">
      <div className="text-center mb-10">
        <p className="text-[12px] font-mono uppercase tracking-widest text-[#38bdf8] font-bold mb-4">
          You're Invited
        </p>
        
        <div className="flex items-center justify-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] overflow-hidden shadow-xl">
            {proj.logo_url ? (
              <img src={proj.logo_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/50 text-[20px] font-bold">
                {(proj.name || '?').charAt(0)}
              </div>
            )}
          </div>
        </div>

        <h1 className="text-[32px] sm:text-[40px] font-extrabold text-white tracking-tight leading-tight mb-3">
          {proj.name}
        </h1>
        
        <div className="flex items-center justify-center gap-2 text-[14.5px] text-white/60">
          <span>Invited by</span>
          <DsrtAvatar src={inviter.avatar_url} name={inviter.full_name} size="xs" />
          <span className="font-semibold text-white">{inviter.full_name || 'Project Admin'}</span>
        </div>
      </div>

      <div className="space-y-6">
        {invite.personal_message && (
          <div className="bg-[#121215] border border-[#38bdf8]/30 rounded-2xl p-6 relative overflow-hidden shadow-[0_0_30px_rgba(56,189,248,0.05)]">
            <div className="absolute inset-0 bg-gradient-to-br from-[#38bdf8]/10 to-transparent pointer-events-none" />
            <div className="relative z-10">
              <EnvelopeSimple size={20} weight="fill" className="text-[#38bdf8] mb-3" />
              <p className="text-[14.5px] text-white/90 leading-relaxed font-medium italic">
                "{invite.personal_message}"
              </p>
            </div>
          </div>
        )}

        <ReviewSection icon={<Briefcase size={16} weight="fill" className="text-white/40" />} title="Your Role">
          <ReviewRow label="Title" value={snap.role_label || 'Team Member'} valueStyle="text-[16px] text-white font-extrabold" />
          <ReviewRow label="Department" value={snap.department_name || '—'} />
          <ReviewRow label="Seniority" value={snap.seniority ? SENIORITY_LABELS[snap.seniority] || snap.seniority : '—'} />
          {snap.reports_to_name && (
            <ReviewRow label="Reports to" value={snap.reports_to_name} />
          )}
          {snap.is_lead && (
            <div className="mt-3 pt-3 border-t border-white/[0.04]">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-purple-500/10 border border-purple-500/20 text-purple-300 text-[11px] font-bold uppercase tracking-wider">
                <ShieldCheck size={12} weight="fill" /> Leadership Position
              </span>
            </div>
          )}
        </ReviewSection>

        <ReviewSection icon={<Code size={16} weight="fill" className="text-white/40" />} title="Contribution Profile">
          <ReviewRow label="Primary focus" value={snap.primary_contribution || '—'} />

          {resps.length > 0 && (
            <div className="pt-4 mt-4 border-t border-white/[0.04]">
              <p className="text-[10.5px] font-mono uppercase tracking-widest text-white/40 mb-3 font-bold">
                Core Responsibilities
              </p>
              <ul className="space-y-2">
                {resps.map((r: any, i: number) => (
                  <li key={i} className="flex items-start gap-3 text-[13.5px] text-white/80">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/20 mt-[7px] shrink-0" />
                    <span className="leading-snug">
                      {r.title}
                      {r.is_primary && <span className="ml-2 text-[9px] font-mono text-[#38bdf8] uppercase tracking-wider bg-[#38bdf8]/10 px-1.5 py-0.5 rounded">Primary</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {skills.length > 0 && (
            <div className="pt-4 mt-4 border-t border-white/[0.04]">
              <p className="text-[10.5px] font-mono uppercase tracking-widest text-white/40 mb-3 font-bold">
                Skills Required
              </p>
              <div className="flex flex-wrap gap-1.5">
                {skills.map((s: string) => (
                  <span key={s} className="text-[12px] font-medium text-white/70 bg-white/[0.04] border border-white/[0.08] px-2.5 py-1 rounded-md">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </ReviewSection>

        <ReviewSection icon={<Target size={16} weight="fill" className="text-white/40" />} title="Initial Work Plan">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4 pb-4 border-b border-white/[0.04]">
            <div>
              <p className="text-[10.5px] font-mono uppercase tracking-widest text-white/40 mb-1 font-bold">Start date</p>
              <p className="text-[13.5px] font-semibold text-white">{formatDate(snap.work_plan?.start_date)}</p>
            </div>
            <div>
              <p className="text-[10.5px] font-mono uppercase tracking-widest text-white/40 mb-1 font-bold">Commitment</p>
              <p className="text-[13.5px] font-semibold text-white">{snap.work_plan?.commitment_hours ? `${snap.work_plan.commitment_hours} hrs/week` : '—'}</p>
            </div>
            <div>
              <p className="text-[10.5px] font-mono uppercase tracking-widest text-white/40 mb-1 font-bold">Model</p>
              <p className="text-[13.5px] font-semibold text-white">{WORKING_MODEL_LABELS[snap.work_plan?.working_model] || snap.work_plan?.working_model || '—'}</p>
            </div>
          </div>

          {objs.length > 0 ? (
            <div>
              <p className="text-[10.5px] font-mono uppercase tracking-widest text-white/40 mb-3 font-bold">
                Initial Objectives
              </p>
              <div className="space-y-3">
                {objs.map((o: any, i: number) => {
                  const pri = PRIORITY_LABELS[o.priority] || PRIORITY_LABELS.normal
                  return (
                    <div key={i} className="flex items-start gap-3 p-3.5 bg-white/[0.02] border border-white/[0.04] rounded-xl">
                      <div className="w-6 h-6 rounded-md bg-white/[0.05] flex items-center justify-center shrink-0 mt-0.5 border border-white/[0.08]">
                        <span className="text-[11px] font-mono font-bold text-white/50">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-semibold text-white leading-snug">{o.title}</p>
                        <div className="flex items-center gap-3 mt-1.5 text-[11.5px]">
                          <span className={cn('font-bold uppercase tracking-wider', pri.color)}>
                            {pri.label}
                          </span>
                          {o.due_date && (
                            <span className="text-white/40 flex items-center gap-1">
                              {formatDate(o.due_date)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <p className="text-[13px] text-white/40 italic">No specific initial objectives defined.</p>
          )}
        </ReviewSection>

        <ReviewSection icon={<ShieldCheck size={16} weight="fill" className="text-white/40" />} title="Access Granted">
          <ReviewRow
            label="Permissions"
            value={`${perms.granted} of ${perms.total} capabilities granted`}
          />
          <div className="pt-3 mt-3 border-t border-white/[0.04]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
              {Object.entries(snap.permissions || {}).map(([domain, flags]: [string, any]) => {
                if (!flags || typeof flags !== 'object') return null
                const grantedFlags = Object.entries(flags).filter(([_, v]) => v).map(([k]) => k)
                if (grantedFlags.length === 0) return null

                return (
                  <div key={domain} className="mb-1">
                    <p className="text-[10.5px] font-mono uppercase tracking-wider text-white/40 mb-1.5 font-bold">
                      {domain}
                    </p>
                    <div className="space-y-1">
                      {grantedFlags.map(f => (
                        <div key={f} className="flex items-center gap-1.5">
                          <CheckCircle size={12} weight="fill" className="text-emerald-400 shrink-0" />
                          <span className="text-[12.5px] text-white/75 font-medium capitalize">
                            {f.replace(/_/g, ' ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </ReviewSection>

        <div className="mt-10 p-6 sm:p-8 bg-[#121215] border border-white/[0.08] rounded-2xl">
          <div className="flex items-start gap-3 mb-6">
            <div className="mt-0.5 relative flex items-center justify-center w-5 h-5 shrink-0">
              <div className="w-5 h-5 border-2 border-[#38bdf8] bg-[#38bdf8]/10 rounded flex items-center justify-center">
                <Check size={12} weight="bold" className="text-[#38bdf8]" />
              </div>
            </div>
            <p className="text-[13.5px] text-white/80 leading-relaxed font-medium">
              I have reviewed the role, responsibilities, work plan, and access. I understand what I am joining.
              <span className="block mt-1 text-[11.5px] text-white/40 font-normal">
                (You can suggest modifications to the work plan during the onboarding phase after accepting).
              </span>
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={() => handleAction('decline')}
              disabled={!!processing}
              className="w-full sm:w-auto px-6 h-12 rounded-xl border border-white/[0.1] bg-white/[0.02] hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 text-[14px] font-semibold text-white/60 transition-colors disabled:opacity-50"
            >
              {processing === 'decline' ? <CircleNotch size={16} className="animate-spin mx-auto" /> : 'Decline'}
            </button>
            
            <button
              onClick={() => handleAction('accept')}
              disabled={!!processing}
              className="w-full flex-1 h-12 rounded-xl bg-white hover:bg-white/90 text-black text-[14.5px] font-extrabold flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50 shadow-lg"
            >
              {processing === 'accept' ? (
                <><CircleNotch size={16} className="animate-spin" /> Processing...</>
              ) : (
                <><CheckCircle size={16} weight="fill" /> Accept Invitation</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ReviewSection({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <DsrtPanel padding="none" variant="default" className="overflow-hidden">
      <div className="flex items-center gap-2.5 px-6 py-4 border-b border-white/[0.06] bg-white/[0.01]">
        {icon}
        <h3 className="text-[14.5px] font-bold text-white tracking-tight">{title}</h3>
      </div>
      <div className="p-6 space-y-2">{children}</div>
    </DsrtPanel>
  )
}

function ReviewRow({ label, value, valueStyle }: { label: string; value: string; valueStyle?: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4 py-1.5">
      <span className="text-[11.5px] font-mono uppercase tracking-widest text-white/40 shrink-0 font-bold">
        {label}
      </span>
      <span className={cn("text-[14px] font-semibold text-white text-left sm:text-right truncate max-w-[340px]", valueStyle)}>
        {value}
      </span>
    </div>
  )
}