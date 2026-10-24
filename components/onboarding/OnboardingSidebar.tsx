'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { OnboardingStepKey, StepStatus } from '@/stores/onboardingV2Store'

interface StepConfig {
  key: OnboardingStepKey
  number: number
  title: string
  description: string
}

const steps: StepConfig[] = [
  { key: 'identity',        number: 1, title: 'Identity',       description: 'Claim your DSRT username' },
  { key: 'profile',         number: 2, title: 'Profile',        description: 'Photo and location' },
  { key: 'professional',    number: 3, title: 'Professional',   description: 'How you identify' },
  { key: 'skills',          number: 4, title: 'Skills',         description: 'What you can do' },
  { key: 'personalization', number: 5, title: 'Personalization', description: 'Tailor your experience' },
  { key: 'security_pin',    number: 6, title: 'Security PIN',   description: 'Fast alternative login' },
]

const stepTips: Record<OnboardingStepKey, { title: string; tips: string[]; usage: string }> = {
  identity: {
    title: 'Tips for choosing your username',
    tips: [
      'Keep it short and easy to remember.',
      'Your username becomes your DSRT workspace address and profile link.',
      'You cannot easily change this later, so choose carefully.',
    ],
    usage: 'Your username powers your public profile URL, your DSRT Mail address, and how collaborators find you across the platform.',
  },
  profile: {
    title: 'Tips for a strong profile',
    tips: [
      'A clear headshot builds trust — profiles with photos get 40% more collaboration requests.',
      'Location helps DSRT match you with nearby founders, local meetups, and regional opportunities.',
      'Both fields are optional but strongly recommended.',
    ],
    usage: 'Your photo appears on your profile, comments, messages, and project pages. Your location powers proximity-based recommendations.',
  },
  professional: {
    title: 'Tips for professional identity',
    tips: [
      'Choose up to 5 roles that genuinely describe what you do.',
      'Selecting specific roles improves match quality by up to 3x.',
      'You can update these anytime as your career evolves.',
    ],
    usage: 'Your roles shape which opportunities you see, who finds you in search, and which communities DSRT suggests to you.',
  },
  skills: {
    title: 'Tips for adding skills',
    tips: [
      'Add at least 5 skills for the strongest matching.',
      'Include both technical skills and soft skills.',
      'Search our global taxonomy — thousands of skills across every industry.',
    ],
    usage: 'Skills power DSRT AI recommendations, opportunity matching, and how collaborators evaluate fit for teams and projects.',
  },
  personalization: {
    title: 'Tips for personalization',
    tips: [
      'Your goals shape what appears in your home feed.',
      'Topics unlock cross-industry recommendations.',
      'Your building status helps others understand where you are in your journey.',
    ],
    usage: 'DSRT uses these signals to rank opportunities, suggest collaborators, and personalize every screen you see from day one.',
  },
  security_pin: {
    title: 'Tips for your PIN',
    tips: [
      'Pick 6 digits you can remember without writing down.',
      'Avoid sequences like 123456 or birthdate patterns.',
      'You can update your PIN anytime from Security Settings.',
    ],
    usage: 'Your PIN is stored as a salted hash — never in plain text. It offers a faster login option, especially on mobile.',
  },
}

interface Props {
  currentStep: OnboardingStepKey
  stepStates: Record<OnboardingStepKey, StepStatus>
  onStepClick: (step: OnboardingStepKey) => void
}

export function OnboardingSidebar({ currentStep, stepStates, onStepClick }: Props) {
  const currentTips = stepTips[currentStep]

  return (
    <aside className="w-full lg:w-[300px] lg:flex-shrink-0">
      <div className="lg:sticky lg:top-24 space-y-6">
        {/* Setup Steps */}
        <div>
          <p className="text-[11px] font-bold text-white/40 tracking-widest uppercase mb-4 px-1">
            Your Setup
          </p>

          <nav className="space-y-0.5">
            {steps.map((step) => {
              const status = stepStates[step.key]
              const isCurrent = currentStep === step.key
              const isCompleted = status === 'COMPLETED' || status === 'SKIPPED'
              const isClickable = isCompleted || isCurrent

              return (
                <button
                  key={step.key}
                  type="button"
                  onClick={() => isClickable && onStepClick(step.key)}
                  disabled={!isClickable}
                  className={cn(
                    'w-full flex items-start gap-3 px-3 py-2.5 rounded-md text-left transition-all',
                    isCurrent && 'bg-white/[0.04]',
                    isCompleted && !isCurrent && 'hover:bg-white/[0.02]',
                    !isCurrent && !isCompleted && 'cursor-not-allowed opacity-40'
                  )}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {isCompleted && !isCurrent ? (
                      <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center">
                        <Check className="w-3 h-3 text-emerald-400" strokeWidth={3} />
                      </div>
                    ) : isCurrent ? (
                      <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center">
                        <span className="text-[10px] font-bold text-black">{step.number}</span>
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full border border-white/20 flex items-center justify-center">
                        <span className="text-[10px] font-medium text-white/40">{step.number}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div
                      className={cn(
                        'text-[13px] font-semibold leading-tight',
                        isCurrent ? 'text-white' : isCompleted ? 'text-white/80' : 'text-white/50'
                      )}
                    >
                      {step.title}
                      {status === 'SKIPPED' && (
                        <span className="ml-1.5 text-[10px] font-normal text-white/40">(skipped)</span>
                      )}
                    </div>
                    <div className="text-[11px] text-white/40 mt-0.5 leading-tight">
                      {step.description}
                    </div>
                  </div>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Tips Panel */}
        <div className="rounded-md border border-white/[0.06] bg-[#0A0A0C] p-4">
          <p className="text-[10px] font-bold text-white/50 tracking-widest uppercase mb-3">
            {currentTips.title}
          </p>
          <ul className="space-y-2">
            {currentTips.tips.map((tip, idx) => (
              <li key={idx} className="text-[12px] text-white/65 leading-relaxed flex gap-2">
                <span className="text-white/30 flex-shrink-0">·</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* How we use this data */}
        <div className="rounded-md border border-white/[0.06] bg-[#0A0A0C] p-4">
          <p className="text-[10px] font-bold text-white/50 tracking-widest uppercase mb-2">
            How we use this
          </p>
          <p className="text-[12px] text-white/65 leading-relaxed">
            {currentTips.usage}
          </p>
        </div>
      </div>
    </aside>
  )
}

export { steps as onboardingStepConfig }