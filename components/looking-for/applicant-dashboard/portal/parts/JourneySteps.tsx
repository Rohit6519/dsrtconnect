'use client'

import { CheckCircle } from '@phosphor-icons/react'

const STEPS = [
  { key: 'submitted',   label: 'Submitted' },
  { key: 'reviewing',   label: 'Under review' },
  { key: 'screening',   label: 'Shortlisted' },
  { key: 'interviewing',label: 'Interviewing' },
  { key: 'decision',    label: 'Decision' },
]

const STAGE_INDEX: Record<string, number> = {
  draft: -1,
  applied: 0, submitted: 0, pending: 0,
  reviewing: 1,
  screening: 2,
  interviewing: 3,
  offered: 4, hired: 4, rejected: 4, withdrawn: 4,
}

export function JourneySteps({ application }: { application: any }) {
  const idx = STAGE_INDEX[application.pipeline_stage] ?? 0
  const isRejected = application.pipeline_stage === 'rejected'
  const isWithdrawn = application.pipeline_stage === 'withdrawn'

  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-[#18181b] via-[#121215] to-[#0f0f11] p-6">
      <h3 className="text-[13px] font-bold text-white mb-5">Your journey</h3>
      <div className="flex items-center">
        {STEPS.map((s, i) => {
          const done = i < idx
          const current = i === idx
          const failedFinal = i === STEPS.length - 1 && (isRejected || isWithdrawn)
          return (
            <div key={s.key} className="flex-1 flex items-center min-w-0">
              <div className="flex flex-col items-center gap-1.5 min-w-0">
                <div className={
                  'w-8 h-8 rounded-full border flex items-center justify-center text-[11px] font-bold ' +
                  (done || failedFinal
                    ? (failedFinal
                        ? 'border-red-500/30 bg-red-500/10 text-red-300'
                        : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300')
                    : current
                      ? 'border-blue-500/40 bg-blue-500/10 text-blue-300 shadow-[0_0_0_4px_rgba(59,130,246,0.06)]'
                      : 'border-zinc-800 bg-zinc-950 text-zinc-500')
                }>
                  {done || failedFinal
                    ? <CheckCircle size={12} weight="fill" />
                    : (i + 1)}
                </div>
                <div className={
                  'text-[10.5px] font-semibold uppercase tracking-wider text-center max-w-[80px] truncate ' +
                  (done || current ? 'text-zinc-200' : 'text-zinc-500')
                }>{s.label}</div>
              </div>
              {i < STEPS.length - 1 && (
                <div className={
                  'flex-1 h-px mx-2 ' +
                  (i < idx ? 'bg-emerald-500/30' : 'bg-zinc-800')
                } />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}