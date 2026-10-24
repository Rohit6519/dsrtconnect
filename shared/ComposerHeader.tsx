'use client'

import { X } from '@phosphor-icons/react'

interface Step {
  id: string
  label: string
}

interface Props {
  steps: Step[]
  currentStep: number
  onClose: () => void
  ventureName: string
}

export function ComposerHeader({ steps, currentStep, onClose, ventureName }: Props) {
  return (
    <div className="border-b border-white/[0.06]">
      {/* Top bar */}
      <div className="px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-[10.5px] font-mono uppercase tracking-widest text-zinc-500 font-bold">
            Invite Member
          </p>
          <h2 className="text-[16px] font-bold text-white mt-0.5">
            {ventureName}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] flex items-center justify-center text-zinc-500 hover:text-white transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Step indicator */}
      <div className="px-6 pb-4">
        <div className="flex items-center gap-1.5">
          {steps.map((step, idx) => {
            const active = idx === currentStep
            const done = idx < currentStep
            return (
              <div key={step.id} className="flex items-center gap-1.5 flex-1">
                <div className={
                  'flex items-center gap-2 flex-1 h-1 rounded-full transition-all ' +
                  (done ? 'bg-white' : active ? 'bg-white/60' : 'bg-white/[0.06]')
                } />
                {idx === currentStep && (
                  <span className="text-[10px] font-mono uppercase tracking-widest text-white font-bold whitespace-nowrap">
                    {step.label}
                  </span>
                )}
              </div>
            )
          })}
        </div>

        <div className="flex items-center justify-between mt-2">
          <p className="text-[11px] text-zinc-500">
            Step {currentStep + 1} of {steps.length}
          </p>
          <p className="text-[11px] text-zinc-500 font-mono">
            {steps[currentStep]?.label}
          </p>
        </div>
      </div>
    </div>
  )
}