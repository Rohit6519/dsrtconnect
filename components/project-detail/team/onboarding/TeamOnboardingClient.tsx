'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  User, Briefcase, Code, Sliders, ChatText, Target,
  CheckCircle, ArrowRight, CircleNotch, GlobeHemisphereWest
} from '@phosphor-icons/react'
import { DsrtAvatar, DsrtButton, DsrtPanel } from '@/components/dsrt'
import { cn } from '@/lib/utils'
import type { OnboardingStep } from '@/types/team'

const STEPS: Array<{ id: OnboardingStep; label: string; icon: any }> = [
  { id: 'identity',      label: 'Identity',            icon: User },
  { id: 'profile',       label: 'Professional Profile',icon: Briefcase },
  { id: 'skills',        label: 'Skills',              icon: Code },
  { id: 'preferences',   label: 'Working Preferences', icon: Sliders },
  { id: 'communication', label: 'Communication',       icon: ChatText },
  { id: 'work_plan',     label: 'Work Plan',           icon: Target },
  { id: 'workspace',     label: 'Workspace Setup',     icon: GlobeHemisphereWest },
  { id: 'complete',      label: 'Complete',            icon: CheckCircle },
]

export function TeamOnboardingClient({ project, member, onboarding, profile }: any) {
  const router = useRouter()
  const supabase = createClient()
  const snapshot = onboarding.invitation?.snapshot || {}

  // ─── STATE ────────────────────────────────────────────────────────
  const [currentStepId, setCurrentStepId] = useState<OnboardingStep>(onboarding.current_step || 'identity')
  const [saving, setSaving] = useState(false)

  // Step 2: Profile
  const [profTitle, setProfTitle] = useState(onboarding.professional_data?.title || member.role || '')
  const [profDiscipline, setProfDiscipline] = useState(onboarding.professional_data?.primary_discipline || '')
  const [profTimezone, setProfTimezone] = useState(onboarding.professional_data?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone)

  // Step 3: Skills
  const [skills, setSkills] = useState<string[]>(onboarding.skills_data?.skills || snapshot.skills || [])
  const [skillInput, setSkillInput] = useState('')

  // Step 4: Preferences
  const [commStyle, setCommStyle] = useState(onboarding.preferences_data?.communication_style || 'async-first')
  const [deepWork, setDeepWork] = useState(onboarding.preferences_data?.deep_work_hours || '10:00 - 14:00')

  // Step 5: Communication
  const [respExpect, setRespExpect] = useState(onboarding.preferences_data?.response_expectation || '24 hours')

  // Step 6: Work Plan Confirmation
  const [workPlanResponse, setWorkPlanResponse] = useState<'accepted' | 'suggested_changes' | null>(null)
  const [workPlanNotes, setWorkPlanNotes] = useState('')

  const currentIdx = STEPS.findIndex(s => s.id === currentStepId)

  // ─── HANDLERS ───────────────────────────────────────────────────────
  
  const saveProgress = async (nextStepId: OnboardingStep) => {
    setSaving(true)
    try {
      const payload = {
        current_step: nextStepId,
        professional_data: { title: profTitle, primary_discipline: profDiscipline, timezone: profTimezone },
        skills_data: { skills },
        preferences_data: { communication_style: commStyle, response_expectation: respExpect, deep_work_hours: deepWork }
      }
      
      // Update DB directly (safe via RLS)
      await supabase.from('project_team_onboarding').update(payload).eq('id', onboarding.id)
      setCurrentStepId(nextStepId)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e) {
      toast.error('Failed to save progress')
    } finally {
      setSaving(false)
    }
  }

  const handleComplete = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/projects/${project.slug}/team/onboarding/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workPlanResponse,
          workPlanNotes: workPlanResponse === 'suggested_changes' ? workPlanNotes : null,
          professionalData: { title: profTitle, primary_discipline: profDiscipline, timezone: profTimezone },
          skillsData: { skills },
          preferencesData: { communication_style: commStyle, response_expectation: respExpect, deep_work_hours: deepWork }
        })
      })
      if (!res.ok) throw new Error()
      
      toast.success('Welcome to the team!')
      router.replace(`/projects/${project.slug}?tab=team`)
    } catch (e) {
      toast.error('Failed to complete onboarding')
      setSaving(false)
    }
  }

  // ─── RENDERERS ───────────────────────────────────────────────────────

  return (
    <div className="flex flex-col md:flex-row gap-8 lg:gap-12 animate-in slide-in-from-bottom-4 duration-500">
      
      {/* ─── LEFT: STEPPER ────────────────────────────────────────────── */}
      <div className="w-full md:w-[240px] shrink-0">
        <div className="sticky top-[100px]">
          <h2 className="text-[14px] font-bold text-white mb-6 uppercase tracking-widest font-mono">
            Team Onboarding
          </h2>
          <div className="space-y-4">
            {STEPS.map((s, idx) => {
              const isActive = idx === currentIdx
              const isPast = idx < currentIdx
              const Icon = s.icon
              return (
                <div key={s.id} className="flex items-center gap-3">
                  <div className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center transition-colors",
                    isActive ? "bg-[#38bdf8]/10 border border-[#38bdf8]/30 text-[#38bdf8]" :
                    isPast ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400" :
                    "bg-white/[0.02] border border-white/[0.06] text-white/30"
                  )}>
                    {isPast ? <CheckCircle size={14} weight="fill" /> : <Icon size={12} weight="bold" />}
                  </div>
                  <span className={cn(
                    "text-[13px] font-semibold transition-colors",
                    isActive ? "text-white" : isPast ? "text-white/70" : "text-white/30"
                  )}>
                    {s.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ─── RIGHT: CONTENT ───────────────────────────────────────────── */}
      <div className="flex-1 max-w-[600px]">
        <DsrtPanel padding="lg" variant="default" className="min-h-[500px] flex flex-col">
          
          {currentStepId === 'identity' && (
            <div className="flex-1 animate-in fade-in">
              <h3 className="text-[24px] font-extrabold text-white mb-2">Confirm Identity</h3>
              <p className="text-[14px] text-white/50 mb-8">You are joining as this DSRT account.</p>
              
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6 flex items-center gap-4">
                <DsrtAvatar src={profile.avatar_url} name={profile.full_name || profile.username} size="lg" />
                <div>
                  <p className="text-[18px] font-bold text-white">{profile.full_name}</p>
                  <p className="text-[13px] font-mono text-white/50 mb-1">@{profile.username}</p>
                  <p className="text-[13px] text-white/40">{profile.email}</p>
                </div>
              </div>
            </div>
          )}

          {currentStepId === 'profile' && (
            <div className="flex-1 animate-in fade-in space-y-6">
              <div>
                <h3 className="text-[24px] font-extrabold text-white mb-2">Professional Profile</h3>
                <p className="text-[14px] text-white/50">Details relevant to your role on this team.</p>
              </div>
              
              <div>
                <label className="text-[11.5px] font-mono font-bold uppercase tracking-wider text-white/50 mb-2 block">Professional Title</label>
                <input value={profTitle} onChange={e => setProfTitle(e.target.value)} className="w-full h-11 bg-white/[0.03] border border-white/[0.1] rounded-lg px-4 text-[14px] text-white outline-none focus:border-[#38bdf8]/50" />
              </div>
              <div>
                <label className="text-[11.5px] font-mono font-bold uppercase tracking-wider text-white/50 mb-2 block">Primary Discipline</label>
                <input value={profDiscipline} onChange={e => setProfDiscipline(e.target.value)} placeholder="e.g. Backend Engineering" className="w-full h-11 bg-white/[0.03] border border-white/[0.1] rounded-lg px-4 text-[14px] text-white outline-none focus:border-[#38bdf8]/50" />
              </div>
              <div>
                <label className="text-[11.5px] font-mono font-bold uppercase tracking-wider text-white/50 mb-2 block">Timezone</label>
                <input value={profTimezone} onChange={e => setProfTimezone(e.target.value)} className="w-full h-11 bg-white/[0.03] border border-white/[0.1] rounded-lg px-4 text-[14px] text-white outline-none focus:border-[#38bdf8]/50" />
              </div>
            </div>
          )}

          {currentStepId === 'skills' && (
            <div className="flex-1 animate-in fade-in space-y-6">
              <div>
                <h3 className="text-[24px] font-extrabold text-white mb-2">Technical Skills</h3>
                <p className="text-[14px] text-white/50">Skills you'll utilize in this role.</p>
              </div>
              <div className="bg-[#121215] border border-white/[0.06] rounded-xl p-5">
                <div className="flex flex-wrap gap-2 mb-4">
                  {skills.map(s => (
                    <span key={s} className="bg-white/[0.06] border border-white/[0.1] rounded-md px-2.5 py-1 text-[13px] font-medium text-white flex items-center gap-1.5">
                      {s} <button onClick={() => setSkills(skills.filter(x => x !== s))} className="text-white/40 hover:text-white"><X size={12} weight="bold"/></button>
                    </span>
                  ))}
                </div>
                <input 
                  value={skillInput} 
                  onChange={e => setSkillInput(e.target.value)}
                  onKeyDown={e => { if(e.key==='Enter'){ e.preventDefault(); if(skillInput.trim() && !skills.includes(skillInput.trim())) { setSkills([...skills, skillInput.trim()]); setSkillInput('') }}}}
                  placeholder="Type a skill and press Enter..."
                  className="w-full h-10 bg-white/[0.03] border border-white/[0.1] rounded-lg px-4 text-[13px] text-white outline-none focus:border-[#38bdf8]/50"
                />
              </div>
            </div>
          )}

          {currentStepId === 'preferences' && (
            <div className="flex-1 animate-in fade-in space-y-6">
              <div>
                <h3 className="text-[24px] font-extrabold text-white mb-2">How do you work?</h3>
                <p className="text-[14px] text-white/50">Helps the team understand your style.</p>
              </div>
              <div>
                <label className="text-[11.5px] font-mono font-bold uppercase tracking-wider text-white/50 mb-3 block">Communication Style</label>
                <div className="grid gap-2">
                  {['async-first', 'balanced', 'meeting-heavy'].map(opt => (
                    <button key={opt} onClick={() => setCommStyle(opt)} className={cn("p-4 rounded-xl border text-left flex items-center justify-between", commStyle === opt ? "bg-[#38bdf8]/10 border-[#38bdf8]/30" : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]")}>
                      <span className={cn("text-[14px] font-bold capitalize", commStyle === opt ? "text-[#38bdf8]" : "text-white")}>{opt.replace('-', ' ')}</span>
                      {commStyle === opt && <CheckCircle size={16} weight="fill" className="text-[#38bdf8]" />}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[11.5px] font-mono font-bold uppercase tracking-wider text-white/50 mb-2 block">Deep Work Hours</label>
                <input value={deepWork} onChange={e => setDeepWork(e.target.value)} placeholder="e.g. 10:00 - 14:00" className="w-full h-11 bg-white/[0.03] border border-white/[0.1] rounded-lg px-4 text-[14px] text-white outline-none focus:border-[#38bdf8]/50" />
              </div>
            </div>
          )}

          {currentStepId === 'communication' && (
            <div className="flex-1 animate-in fade-in space-y-6">
              <div>
                <h3 className="text-[24px] font-extrabold text-white mb-2">Response Expectations</h3>
                <p className="text-[14px] text-white/50">When should the team expect a reply to non-urgent messages?</p>
              </div>
              <div className="grid gap-2">
                {['same day', '24 hours', '48 hours'].map(opt => (
                  <button key={opt} onClick={() => setRespExpect(opt)} className={cn("p-4 rounded-xl border text-left flex items-center justify-between", respExpect === opt ? "bg-white/[0.08] border-white/[0.2]" : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]")}>
                    <span className={cn("text-[14px] font-bold capitalize", respExpect === opt ? "text-white" : "text-white/70")}>{opt}</span>
                    {respExpect === opt && <CheckCircle size={16} weight="fill" className="text-white" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentStepId === 'work_plan' && (
            <div className="flex-1 animate-in fade-in space-y-6">
              <div>
                <h3 className="text-[24px] font-extrabold text-white mb-2">Work Plan Confirmation</h3>
                <p className="text-[14px] text-white/50">Review your initial objectives assigned by the owner.</p>
              </div>
              
              <div className="bg-[#121215] border border-white/[0.06] rounded-xl p-5 space-y-4">
                {snapshot.work_plan?.objectives?.map((obj: any, i: number) => (
                  <div key={i} className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-lg">
                    <p className="text-[14px] font-bold text-white leading-snug">{obj.title}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-[11.5px] font-mono text-white/40">
                      <span>Priority: {obj.priority.toUpperCase()}</span>
                      {obj.due_date && <span>Due: {obj.due_date}</span>}
                    </div>
                  </div>
                ))}
                {(!snapshot.work_plan?.objectives || snapshot.work_plan.objectives.length === 0) && (
                  <p className="text-[13px] text-white/40 italic">No initial objectives assigned.</p>
                )}
              </div>

              <div className="space-y-3 pt-4 border-t border-white/[0.06]">
                <button onClick={() => setWorkPlanResponse('accepted')} className={cn("w-full p-4 rounded-xl border flex items-center justify-between transition-colors", workPlanResponse === 'accepted' ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-white/[0.02] border-white/[0.06] text-white hover:bg-white/[0.04]")}>
                  <span className="font-bold text-[14px]">Accept plan as is</span>
                  {workPlanResponse === 'accepted' && <CheckCircle size={16} weight="fill" />}
                </button>
                <button onClick={() => setWorkPlanResponse('suggested_changes')} className={cn("w-full p-4 rounded-xl border flex items-center justify-between transition-colors", workPlanResponse === 'suggested_changes' ? "bg-amber-500/10 border-amber-500/30 text-amber-400" : "bg-white/[0.02] border-white/[0.06] text-white hover:bg-white/[0.04]")}>
                  <span className="font-bold text-[14px]">Suggest changes</span>
                  {workPlanResponse === 'suggested_changes' && <CheckCircle size={16} weight="fill" />}
                </button>
              </div>

              {workPlanResponse === 'suggested_changes' && (
                <div className="animate-in slide-in-from-top-2">
                  <label className="text-[11.5px] font-mono font-bold uppercase tracking-wider text-white/50 mb-2 block">Your suggestions</label>
                  <textarea value={workPlanNotes} onChange={e => setWorkPlanNotes(e.target.value)} rows={3} placeholder="e.g. Need more time for objective 2 due to dependencies..." className="w-full bg-white/[0.03] border border-white/[0.1] rounded-xl p-4 text-[14px] text-white outline-none focus:border-amber-500/50 resize-none" />
                </div>
              )}
            </div>
          )}

          {currentStepId === 'workspace' && (
            <div className="flex-1 animate-in fade-in flex flex-col items-center justify-center text-center py-10">
              <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-6">
                <GlobeHemisphereWest size={28} weight="fill" className="text-blue-400" />
              </div>
              <h3 className="text-[24px] font-extrabold text-white mb-2">Workspace Ready</h3>
              <p className="text-[14px] text-white/50 max-w-[280px]">Your DSRT permissions are configured and you have access to the team graph.</p>
            </div>
          )}

          {currentStepId === 'complete' && (
            <div className="flex-1 animate-in fade-in flex flex-col items-center justify-center text-center py-10">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(16,185,129,0.15)]">
                <CheckCircle size={32} weight="fill" className="text-emerald-400" />
              </div>
              <h3 className="text-[24px] font-extrabold text-white mb-2">Onboarding Complete</h3>
              <p className="text-[14px] text-white/50 max-w-[280px]">You are now an active member of {project.name}.</p>
            </div>
          )}

          {/* ─── FOOTER ACTIONS ────────────────────────────────────────── */}
          <div className="mt-10 pt-6 border-t border-white/[0.06] flex items-center justify-between">
            {currentIdx > 0 ? (
              <DsrtButton variant="ghost" onClick={() => saveProgress(STEPS[currentIdx - 1].id)} disabled={saving}>Back</DsrtButton>
            ) : <div />}
            
            {currentIdx < STEPS.length - 1 ? (
              <DsrtButton 
                variant="primary" 
                onClick={() => saveProgress(STEPS[currentIdx + 1].id)} 
                loading={saving}
                disabled={currentStepId === 'work_plan' && !workPlanResponse}
              >
                Next <ArrowRight size={14} weight="bold" />
              </DsrtButton>
            ) : (
              <DsrtButton 
                variant="primary" 
                className="bg-emerald-500 text-black hover:bg-emerald-400"
                onClick={handleComplete} 
                loading={saving}
              >
                <CheckCircle size={16} weight="fill" /> Enter Workspace
              </DsrtButton>
            )}
          </div>
        </DsrtPanel>
      </div>
    </div>
  )
}