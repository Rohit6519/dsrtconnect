'use client'

import type { PipelineStage } from '@/lib/applications/types'

const STYLES: Record<string, string> = {
  reviewing:    'border-blue-500/25 bg-blue-500/[0.08] text-blue-300',
  screening:    'border-cyan-500/25 bg-cyan-500/[0.08] text-cyan-300',
  interviewing: 'border-purple-500/25 bg-purple-500/[0.08] text-purple-300',
  offered:      'border-amber-500/25 bg-amber-500/[0.08] text-amber-300',
  hired:        'border-emerald-500/25 bg-emerald-500/[0.08] text-emerald-300',
  rejected:     'border-red-500/25 bg-red-500/[0.08] text-red-300',
  withdrawn:    'border-zinc-700 bg-zinc-900 text-zinc-400',
}

const LABELS: Record<string, string> = {
  applied:      'Submitted',
  submitted:    'Submitted',
  pending:      'Pending',
  reviewing:    'Reviewing',
  screening:    'Shortlisted',
  interviewing: 'Interview',
  offered:      'Offer',
  hired:        'Selected',
  rejected:     'Rejected',
  withdrawn:    'Withdrawn',
  draft:        'Draft',
}

export function StageBadge({ stage }: { stage: PipelineStage | string }) {
  const cls = STYLES[stage] || 'border-zinc-700 bg-zinc-900 text-zinc-400'
  const label = LABELS[stage] || stage
  return (
    <span className={`inline-flex items-center h-5 px-2 rounded-md text-[10.5px] font-bold uppercase tracking-widest border ${cls}`}>
      {label}
    </span>
  )
}