'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useOnboardingV2Store } from '@/stores/onboardingV2Store'
import { TopicSelector } from '@/components/primitives/TopicSelector'
import { OnboardingFooter } from '@/components/onboarding/OnboardingFooter'
import { cn } from '@/lib/utils'

const GOAL_OPTIONS = [
  { id: 'build_projects', label: 'Build projects' },
  { id: 'start_venture', label: 'Start a venture' },
  { id: 'find_collaborators', label: 'Find collaborators' },
  { id: 'find_opportunities', label: 'Find opportunities' },
  { id: 'showcase_work', label: 'Showcase my work' },
  { id: 'join_team', label: 'Join a team' },
  { id: 'learn_explore', label: 'Learn and explore' },
  { id: 'grow_network', label: 'Grow my network' },
] as const

const BUILDING_OPTIONS = [
  {
    id: 'ACTIVELY_BUILDING' as const,
    label: 'Yes, actively building',
    desc: 'I have something in motion',
  },
  {
    id: 'EXPLORING_IDEA' as const,
    label: 'Exploring an idea',
    desc: 'Still shaping the direction',
  },
  {
    id: 'LOOKING_TO_JOIN' as const,
    label: 'Looking to join something',
    desc: 'I want to contribute to existing work',
  },
  {
    id: 'NOT_RIGHT_NOW' as const,
    label: 'Not right now',
    desc: 'Exploring the platform first',
  },
]

export function PersonalizationStep() {
  const {
    data,
    updateData,
    isSaving,
    setSaving,
    setCurrentStep,
    setStepStates,
    setOnboardingState,
  } = useOnboardingV2Store()

  const [goals, setGoals] = useState<string[]>(data.goals || [])
  const [topics, setTopics] = useState<string[]>(data.interest_topics || [])
  const [buildingStatus, setBuildingStatus] = useState(data.building_status || '')
  const [projectName, setProjectName] = useState(
    data.building_intent?.project_name || ''
  )
  const [projectDescription, setProjectDescription] = useState(
    data.building_intent?.project_description || ''
  )

  const showBuildingDetails = buildingStatus === 'ACTIVELY_BUILDING'

  const canContinue =
    goals.length >= 1 &&
    topics.length >= 3 &&
    !!buildingStatus

  const toggleGoal = (id: string) => {
    setGoals((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    )
  }

  const handleContinue = async () => {
    if (!canContinue) {
      if (goals.length < 1) toast.error('Select at least one goal')
      else if (topics.length < 3) toast.error('Select at least 3 topics')
      else if (!buildingStatus) toast.error('Select your building status')
      return
    }

    setSaving(true)
    try {
      const building_intent =
        buildingStatus === 'ACTIVELY_BUILDING'
          ? {
              project_name: projectName.trim() || undefined,
              project_description: projectDescription.trim() || undefined,
            }
          : {}

      const stepRes = await fetch('/api/onboarding/step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 'personalization',
          status: 'COMPLETED',
          data: {
            goals,
            interest_topics: topics,
            building_status: buildingStatus,
            building_intent,
          },
        }),
      })

      const stepData = await stepRes.json()
      if (!stepRes.ok) throw new Error(stepData.error || 'Failed to save personalization')

      updateData({
        goals,
        interest_topics: topics,
        building_status: buildingStatus as any,
        building_intent,
      })
      setStepStates(stepData.step_states)
      setOnboardingState(stepData.onboarding_state)
      setCurrentStep('security_pin')
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong')
      setSaving(false)
    }
  }

  return (
    <div className="space-y-10">
      {/* Goals */}
      <section className="space-y-3">
        <div>
          <label className="text-[13px] font-medium text-white/90">
            What are you here to do? <span className="text-red-400">*</span>
          </label>
          <p className="text-[12px] text-white/40 mt-1">
            Select all that apply. This shapes your home feed and recommendations.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {GOAL_OPTIONS.map((goal) => {
            const active = goals.includes(goal.id)
            return (
              <button
                key={goal.id}
                type="button"
                onClick={() => toggleGoal(goal.id)}
                className={cn(
                  'h-10 px-3 rounded-md text-left text-[13px] font-medium border transition-all',
                  active
                    ? 'bg-[#4F7CFF]/10 border-[#4F7CFF]/40 text-[#7B99FF]'
                    : 'bg-[#050505] border-white/10 text-white/70 hover:border-white/20 hover:text-white'
                )}
              >
                {goal.label}
              </button>
            )
          })}
        </div>
      </section>

      {/* Topics */}
      <section className="space-y-3">
        <div>
          <label className="text-[13px] font-medium text-white/90">
            Topics you care about <span className="text-red-400">*</span>
          </label>
          <p className="text-[12px] text-white/40 mt-1">
            Choose at least 3. These seed your cold-start recommendations.
          </p>
        </div>

        <TopicSelector
          selected={topics}
          onChange={setTopics}
          minTopics={3}
          maxTopics={10}
        />
      </section>

      {/* Building status */}
      <section className="space-y-3">
        <div>
          <label className="text-[13px] font-medium text-white/90">
            Are you currently building something?{' '}
            <span className="text-red-400">*</span>
          </label>
        </div>

        <div className="space-y-2">
          {BUILDING_OPTIONS.map((opt) => {
            const active = buildingStatus === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setBuildingStatus(opt.id)}
                className={cn(
                  'w-full flex items-start gap-3 p-3 rounded-md border text-left transition-all',
                  active
                    ? 'bg-[#4F7CFF]/10 border-[#4F7CFF]/40'
                    : 'bg-[#050505] border-white/10 hover:border-white/20'
                )}
              >
                <div
                  className={cn(
                    'mt-0.5 w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center',
                    active ? 'border-[#4F7CFF] bg-[#4F7CFF]' : 'border-white/25'
                  )}
                >
                  {active && (
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  )}
                </div>
                <div>
                  <p
                    className={cn(
                      'text-[13px] font-medium',
                      active ? 'text-white' : 'text-white/80'
                    )}
                  >
                    {opt.label}
                  </p>
                  <p className="text-[11px] text-white/40 mt-0.5">{opt.desc}</p>
                </div>
              </button>
            )
          })}
        </div>
      </section>

      {/* Optional lightweight building intent */}
      {showBuildingDetails && (
        <section className="space-y-4 rounded-md border border-white/[0.06] bg-[#0A0A0C] p-4">
          <p className="text-[10px] font-bold text-white/40 tracking-widest uppercase">
            Optional details
          </p>
          <p className="text-[12px] text-white/50 -mt-2">
            You can convert this into a full DSRT Project later. Keep it light.
          </p>

          <div className="space-y-2">
            <label className="text-[13px] font-medium text-white/90">
              Project name
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Name of what you are building (optional)"
              maxLength={80}
              className="w-full h-10 px-3 rounded-md bg-[#050505] border border-white/10 text-white text-[13px] placeholder:text-white/30 focus:outline-none focus:border-[#4F7CFF] focus:ring-1 focus:ring-[#4F7CFF] transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[13px] font-medium text-white/90">
              What are you building?
            </label>
            <textarea
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
              placeholder="One or two sentences about the problem or product (optional)"
              maxLength={300}
              rows={3}
              className="w-full px-3 py-2 rounded-md bg-[#050505] border border-white/10 text-white text-[13px] placeholder:text-white/30 focus:outline-none focus:border-[#4F7CFF] focus:ring-1 focus:ring-[#4F7CFF] transition-all resize-none"
            />
            <p className="text-[11px] text-white/30 font-mono text-right">
              {projectDescription.length}/300
            </p>
          </div>
        </section>
      )}

      <OnboardingFooter
        canContinue={canContinue}
        onBack={() => setCurrentStep('skills')}
        onContinue={handleContinue}
        continueLabel="Continue to PIN"
        isSaving={isSaving}
      />
    </div>
  )
}