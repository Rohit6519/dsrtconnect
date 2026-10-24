// filepath: components/looking-for/studio/steps/StepFooter.tsx
'use client'

import { CaretLeft, CaretRight } from '@phosphor-icons/react'
import { useStudio, type StudioStep } from '../StudioContext'

export function StepFooter({ prev, next }: { prev?: StudioStep; next?: StudioStep }) {
  const { setStep, flushSave } = useStudio()

  const go = async (target: StudioStep) => {
    await flushSave()
    setStep(target)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="mt-10 w-full max-w-7xl mx-auto flex items-center justify-between">
      {prev ? (
        <button
          onClick={() => go(prev)}
          className="inline-flex items-center gap-1.5 h-11 px-5 rounded-xl border border-white/[0.08] hover:border-white/[0.18] bg-gradient-to-b from-white/[0.04] to-white/[0.01] hover:from-white/[0.08] hover:to-white/[0.03] text-[13px] font-semibold text-white/70 hover:text-white transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_2px_6px_rgba(0,0,0,0.2)]"
        >
          <CaretLeft size={12} weight="bold" />
          Back
        </button>
      ) : <span />}
      {next ? (
        <button
          onClick={() => go(next)}
          className="inline-flex items-center gap-1.5 h-11 px-6 rounded-xl bg-white text-black hover:bg-zinc-100 text-[13px] font-bold shadow-[0_4px_16px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.5)] transition-all"
        >
          Continue
          <CaretRight size={12} weight="bold" />
        </button>
      ) : <span />}
    </div>
  )
}