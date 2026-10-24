'use client'

import { CaretLeft, CaretRight } from '@phosphor-icons/react'
import { useAppStudio, type AppStep } from '../AppStudioContext'

export function AppStepFooter({ prev, next }: { prev?: AppStep; next?: AppStep }) {
  const { setStep, flushSave } = useAppStudio()

  const go = async (target: AppStep) => {
    await flushSave()
    setStep(target)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="mt-8 w-full max-w-7xl mx-auto flex items-center justify-between">
      {prev ? (
        <button
          onClick={() => go(prev)}
          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl border border-zinc-800 hover:border-zinc-600 text-[13px] font-semibold text-zinc-300 hover:text-white transition-colors"
        >
          <CaretLeft size={12} weight="bold" />
          Back
        </button>
      ) : <span />}
      {next ? (
        <button
          onClick={() => go(next)}
          className="inline-flex items-center gap-1.5 h-10 px-6 rounded-xl bg-white text-black hover:bg-zinc-200 text-[13px] font-bold shadow-[0_2px_12px_rgba(255,255,255,0.15)] transition-colors"
        >
          Continue
          <CaretRight size={12} weight="bold" />
        </button>
      ) : <span />}
    </div>
  )
}