'use client'

import { useState } from 'react'
import { ArrowLeft, ArrowRight, CircleNotch } from '@phosphor-icons/react'
import { useAssessment } from './AssessmentContext'

interface Props {
  canContinue?: boolean
  continueLabel?: string
  onContinue?: () => Promise<void> | void
  isFinalStep?: boolean
}

export function AssessmentStepFooter({
  canContinue = true,
  continueLabel,
  onContinue,
  isFinalStep = false,
}: Props) {
  const { currentStep, goToStep } = useAssessment()
  const [busy, setBusy] = useState(false)

  const handleBack = async () => {
    if (currentStep <= 1) return
    setBusy(true)
    try { await goToStep(currentStep - 1) } finally { setBusy(false) }
  }

  const handleContinue = async () => {
    setBusy(true)
    try {
      if (onContinue) await onContinue()
      else {
        await goToStep(Math.min(10, currentStep + 1), true)
      }
    } finally { setBusy(false) }
  }

  return (
    <div className="mt-10 pt-6 border-t border-zinc-800/80 flex items-center justify-between">
      <button
        onClick={handleBack}
        disabled={currentStep <= 1 || busy}
        className="inline-flex items-center gap-1.5 h-9 px-3 text-[12.5px] font-medium text-zinc-400 hover:text-white transition-colors disabled:opacity-40"
      >
        <ArrowLeft size={13} />
        Back
      </button>

      <button
        onClick={handleContinue}
        disabled={!canContinue || busy}
        className={
          'inline-flex items-center gap-1.5 h-9 px-4 rounded-md text-[13px] font-semibold transition-all ' +
          (canContinue && !busy
            ? 'bg-white text-black hover:bg-zinc-100'
            : 'bg-zinc-800 text-zinc-500 cursor-not-allowed')
        }
      >
        {busy ? (
          <><CircleNotch size={13} className="animate-spin" /> Saving…</>
        ) : (
          <>
            {continueLabel || (isFinalStep ? 'Review venture' : 'Continue')}
            <ArrowRight size={13} weight="bold" />
          </>
        )}
      </button>
    </div>
  )
}