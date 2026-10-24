'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { useOnboardingV2Store } from '@/stores/onboardingV2Store'
import { SkillAutocomplete, type Skill } from '@/components/primitives/SkillAutocomplete'
import { OnboardingFooter } from '@/components/onboarding/OnboardingFooter'
import { createClient } from '@/lib/supabase/client'

export function SkillsStep() {
  const {
    data,
    updateData,
    isSaving,
    setSaving,
    setCurrentStep,
    setStepStates,
    setOnboardingState,
  } = useOnboardingV2Store()

  const supabase = createClient()
  const [skills, setSkills] = useState<Skill[]>(data.skills || [])
  const [hydratingSkills, setHydratingSkills] = useState(true)

  // Hydrate any skills already saved on the server (resume support)
  useEffect(() => {
    let cancelled = false

    const loadExistingSkills = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: rows } = await supabase
          .from('user_skills')
          .select('id, skill_id, skills:skill_id (id, name, category)')
          .eq('user_id', user.id)

        if (cancelled) return

        if (rows && rows.length > 0) {
          const mapped: Skill[] = rows
            .map((row: any) => {
              if (row.skills) {
                return {
                  id: row.skills.id,
                  canonical_name: row.skills.name,
                  category: row.skills.category || 'General',
                }
              }
              return null
            })
            .filter(Boolean) as Skill[]

          if (mapped.length > 0 && skills.length === 0) {
            setSkills(mapped)
          }
        }
      } catch {
        // non-fatal
      } finally {
        if (!cancelled) setHydratingSkills(false)
      }
    }

    if (data.skills && data.skills.length > 0) {
      setHydratingSkills(false)
      return
    }

    loadExistingSkills()
    return () => {
      cancelled = true
    }
  }, [supabase, data.skills, skills.length])

  const persist = async (status: 'COMPLETED' | 'SKIPPED') => {
    setSaving(true)
    try {
      const res = await fetch('/api/onboarding/step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 'skills',
          status,
          data: {
            skills: status === 'SKIPPED' ? [] : skills,
            skills_skipped: status === 'SKIPPED',
          },
        }),
      })

      const responseData = await res.json()
      if (!res.ok) {
        throw new Error(responseData.error || 'Failed to save skills')
      }

      updateData({
        skills: status === 'SKIPPED' ? [] : skills,
        skills_skipped: status === 'SKIPPED',
      })
      setStepStates(responseData.step_states)
      setOnboardingState(responseData.onboarding_state)
      setCurrentStep('personalization')

      if (status === 'SKIPPED') {
        toast.message('Skills skipped — you can add them anytime from Profile')
      }
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleContinue = async () => {
    if (skills.length === 0) {
      toast.error('Add at least one skill, or choose Skip for now')
      return
    }
    await persist('COMPLETED')
  }

  const handleSkip = async () => {
    await persist('SKIPPED')
  }

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <label className="text-[13px] font-medium text-white/90">
          Skills
        </label>
        <p className="text-[12px] text-white/40 leading-relaxed -mt-1">
          Search our global taxonomy or add a custom skill. This powers matching for projects, Looking For, and recommendations. You can skip and add them later.
        </p>

        {hydratingSkills ? (
          <div className="h-28 rounded-md border border-white/[0.06] bg-[#050505] animate-pulse" />
        ) : (
          <SkillAutocomplete
            selected={skills}
            onChange={setSkills}
            maxSkills={20}
            placeholder="Search skills — Python, Design, Marketing..."
          />
        )}
      </div>

      {/* Context panel */}
      <div className="rounded-md border border-white/[0.06] bg-[#0A0A0C] p-4 space-y-2">
        <p className="text-[10px] font-bold text-white/40 tracking-widest uppercase">
          Why this matters
        </p>
        <ul className="space-y-1.5 text-[12px] text-white/60 leading-relaxed">
          <li>• Structured skills (not free text) improve collaborator and opportunity matching.</li>
          <li>• You can edit skills anytime from Profile → Skills.</li>
          <li>• Skipping is fine — DSRT will not treat skipped as completed.</li>
        </ul>
      </div>

      {skills.length > 0 && (
        <div className="rounded-md border border-white/[0.06] bg-[#0A0A0C] p-4">
          <p className="text-[10px] font-bold text-white/40 tracking-widest uppercase mb-2">
            Selected · {skills.length}
          </p>
          <p className="text-[13px] text-white/80 leading-relaxed">
            {skills.map((s) => s.canonical_name).join(' · ')}
          </p>
        </div>
      )}

      <OnboardingFooter
        canContinue={skills.length > 0}
        onBack={() => setCurrentStep('professional')}
        onContinue={handleContinue}
        onSkip={handleSkip}
        isSaving={isSaving}
      />
    </div>
  )
}