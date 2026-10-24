'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useOnboardingV2Store } from '@/stores/onboardingV2Store'
import { RoleMultiSelect } from '@/components/primitives/RoleMultiSelect'
import { OnboardingFooter } from '@/components/onboarding/OnboardingFooter'

export function ProfessionalStep() {
  const {
    data,
    updateData,
    isSaving,
    setSaving,
    setCurrentStep,
    setStepStates,
    setOnboardingState,
  } = useOnboardingV2Store()

  const [roles, setRoles] = useState<string[]>(data.professional_roles || [])

  const canContinue = roles.length >= 1

  const handleContinue = async () => {
    if (!canContinue) {
      toast.error('Select at least one role that describes you')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/onboarding/step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 'professional',
          status: 'COMPLETED',
          data: {
            professional_roles: roles,
          },
        }),
      })

      const responseData = await res.json()
      if (!res.ok) {
        throw new Error(responseData.error || 'Failed to save professional identity')
      }

      updateData({ professional_roles: roles })
      setStepStates(responseData.step_states)
      setOnboardingState(responseData.onboarding_state)
      setCurrentStep('skills')
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <label className="text-[13px] font-medium text-white/90">
          Professional roles <span className="text-red-400">*</span>
        </label>
        <p className="text-[12px] text-white/40 leading-relaxed -mt-1">
          Choose up to 5 roles. This shapes recommendations, search filters, and how others find you on DSRT Connect.
        </p>

        <RoleMultiSelect
          selected={roles}
          onChange={setRoles}
          maxRoles={5}
        />
      </div>

      {roles.length > 0 && (
        <div className="rounded-md border border-white/[0.06] bg-[#0A0A0C] p-4">
          <p className="text-[10px] font-bold text-white/40 tracking-widest uppercase mb-2">
            Your selection
          </p>
          <p className="text-[13px] text-white/80 leading-relaxed">
            {roles.join(' · ')}
          </p>
        </div>
      )}

      <OnboardingFooter
        canContinue={canContinue}
        onBack={() => setCurrentStep('profile')}
        onContinue={handleContinue}
        isSaving={isSaving}
      />
    </div>
  )
}