'use client'

import { useRouter } from 'next/navigation'
import { ArrowRight, CheckCircle } from '@phosphor-icons/react'

interface Props {
  venture: {
    slug: string
    assessment_status?: string | null
    assessment_current_step?: number | null
    has_verified_assessment?: boolean | null
  }
}

export function AssessmentProgressCard({ venture }: Props) {
  const router = useRouter()

  const status = venture.assessment_status || 'not_started'
  const step = venture.assessment_current_step || 1
  const verified = Boolean(venture.has_verified_assessment)
  const progress = Math.max(0, Math.min(100, ((step - 1) / 10) * 100))

  if (verified && status === 'completed') {
    return (
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle size={13} weight="fill" className="text-emerald-300" />
          <h3 className="text-[13px] font-bold text-white">Assessment complete</h3>
        </div>
        <p className="text-[11.5px] text-zinc-400 leading-relaxed mb-3">
          Your venture is verified. All answers are synced to the venture page.
        </p>
        <button
          onClick={() => router.push(`/ventures/${venture.slug}/assessment/1`)}
          className="w-full inline-flex items-center justify-center gap-1.5 h-8 rounded-md bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.1] text-[11.5px] font-semibold text-zinc-200 hover:text-white transition-colors"
        >
          Review answers
        </button>
      </div>
    )
  }

  if (status === 'in_progress') {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
        <h3 className="text-[13px] font-bold text-white mb-1">Assessment in progress</h3>
        <p className="text-[11.5px] text-zinc-400 leading-relaxed mb-3">
          Step {step} of 10 · Finish to unlock the verified badge.
        </p>
        <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden mb-3">
          <div
            className="h-full bg-white/70 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <button
          onClick={() => router.push(`/ventures/${venture.slug}/assessment/${step}`)}
          className="w-full inline-flex items-center justify-center gap-1.5 h-9 rounded-lg bg-white text-black hover:bg-zinc-100 text-[12.5px] font-bold transition-colors"
        >
          Resume assessment <ArrowRight size={11} weight="bold" />
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
      <h3 className="text-[13px] font-bold text-white mb-1">Complete your assessment</h3>
      <p className="text-[11.5px] text-zinc-400 leading-relaxed mb-3">
        A structured 10-step reflection. Unlocks the verified badge and investor visibility.
      </p>
      <button
        onClick={() => router.push(`/ventures/${venture.slug}/assessment/1`)}
        className="w-full inline-flex items-center justify-center gap-1.5 h-9 rounded-lg bg-white text-black hover:bg-zinc-100 text-[12.5px] font-bold transition-colors"
      >
        Start assessment <ArrowRight size={11} weight="bold" />
      </button>
    </div>
  )
}