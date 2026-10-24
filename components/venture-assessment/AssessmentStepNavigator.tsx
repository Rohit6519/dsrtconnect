'use client'

import { Check } from '@phosphor-icons/react'
import { useAssessment } from './AssessmentContext'

interface StepDef {
  number: number
  title: string
  subtitle: string
}

const STEPS: StepDef[] = [
  { number: 1,  title: 'Idea',            subtitle: 'What you are building' },
  { number: 2,  title: 'Problem',         subtitle: 'The problem you solve' },
  { number: 3,  title: 'Insight',         subtitle: 'Why it matters' },
  { number: 4,  title: 'Customer',        subtitle: 'Who you serve' },
  { number: 5,  title: 'Solution',        subtitle: 'How you solve it' },
  { number: 6,  title: 'Market',          subtitle: 'Reach and distribution' },
  { number: 7,  title: 'Competition',     subtitle: 'Alternatives and edge' },
  { number: 8,  title: 'Founder & Team',  subtitle: 'People behind it' },
  { number: 9,  title: 'Reality Check',   subtitle: 'Assumptions and risks' },
  { number: 10, title: 'Next Move',       subtitle: 'What you do next' },
]

export function AssessmentStepNavigator() {
  const { currentStep, isStepCompleted, canAccessStep, goToStep } = useAssessment()

  return (
    <nav aria-label="Assessment steps" className="space-y-1">
      <p className="text-[10.5px] font-mono uppercase tracking-widest text-zinc-500 font-semibold mb-4">
        Venture Setup
      </p>

      {STEPS.map(step => {
        const isActive = currentStep === step.number
        const isCompleted = isStepCompleted(step.number)
        const canAccess = canAccessStep(step.number)

        return (
          <button
            key={step.number}
            onClick={() => canAccess && goToStep(step.number)}
            disabled={!canAccess}
            className={
              'w-full text-left flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors ' +
              (isActive
                ? 'bg-zinc-900/80 border border-zinc-800'
                : canAccess
                  ? 'hover:bg-zinc-900/40 border border-transparent'
                  : 'opacity-40 cursor-not-allowed border border-transparent')
            }
          >
            <div
              className={
                'flex-shrink-0 mt-0.5 w-[22px] h-[22px] rounded-full flex items-center justify-center text-[11px] font-semibold transition-colors ' +
                (isCompleted
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : isActive
                    ? 'bg-white text-black'
                    : 'bg-zinc-900 text-zinc-500 border border-zinc-800')
              }
            >
              {isCompleted ? <Check size={11} weight="bold" /> : step.number}
            </div>
            <div className="min-w-0 flex-1">
              <div className={
                'text-[13px] font-semibold leading-tight ' +
                (isActive ? 'text-white' : isCompleted ? 'text-zinc-200' : 'text-zinc-400')
              }>
                {step.title}
              </div>
              <div className="text-[11.5px] text-zinc-500 mt-0.5 leading-tight">
                {step.subtitle}
              </div>
            </div>
          </button>
        )
      })}
    </nav>
  )
}