'use client'

import { CheckCircle, PauseCircle, ChatCircle, Handshake, XCircle, PencilSimple } from '@phosphor-icons/react'

const STAGE_META: Record<string, { label: string; Icon: any; className: string }> = {
  draft:        { label: 'Draft',        Icon: PencilSimple, className: 'border-zinc-700 bg-zinc-900 text-zinc-400' },
  submitted:    { label: 'Submitted',    Icon: CheckCircle,  className: 'border-zinc-700 bg-zinc-900 text-zinc-300' },
  applied:      { label: 'Submitted',    Icon: CheckCircle,  className: 'border-zinc-700 bg-zinc-900 text-zinc-300' },
  pending:      { label: 'Pending',      Icon: PauseCircle,  className: 'border-zinc-700 bg-zinc-900 text-zinc-300' },
  reviewing:    { label: 'Reviewing',    Icon: PauseCircle,  className: 'border-blue-500/30 bg-blue-500/10 text-blue-300' },
  screening:    { label: 'Shortlisted',  Icon: CheckCircle,  className: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300' },
  interviewing: { label: 'Interviewing', Icon: ChatCircle,   className: 'border-purple-500/30 bg-purple-500/10 text-purple-300' },
  offered:      { label: 'Offer',        Icon: Handshake,    className: 'border-amber-500/30 bg-amber-500/10 text-amber-300' },
  hired:        { label: 'Selected',     Icon: CheckCircle,  className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' },
  rejected:     { label: 'Not selected', Icon: XCircle,      className: 'border-red-500/30 bg-red-500/10 text-red-300' },
  withdrawn:    { label: 'Withdrawn',    Icon: XCircle,      className: 'border-zinc-700 bg-zinc-900 text-zinc-500' },
}

export function StatusRibbon({ application, opportunity }: { application: any; opportunity: any }) {
  const meta = STAGE_META[application.pipeline_stage] || STAGE_META.submitted
  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-[#18181b] via-[#121215] to-[#0f0f11] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden flex items-center justify-center shrink-0">
          {opportunity.venture?.logo_url ? (
            <img src={opportunity.venture.logo_url} className="w-full h-full object-cover" alt="" />
          ) : opportunity.project?.icon ? (
            <span className="text-xl">{opportunity.project.icon}</span>
          ) : (
            <span className="text-[16px] font-bold text-zinc-500">{(opportunity.title || '?').charAt(0)}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-[19px] font-bold text-white leading-tight">{opportunity.title}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[12px] text-zinc-500">
            {(opportunity.project?.name || opportunity.venture?.name) && (
              <span className="text-zinc-400 font-medium">{opportunity.project?.name || opportunity.venture?.name}</span>
            )}
            {opportunity.opportunity_number && <span className="font-mono">{opportunity.opportunity_number}</span>}
          </div>
        </div>
        <div className={`inline-flex items-center gap-2 h-8 px-3 rounded-lg text-[12.5px] font-bold border ${meta.className}`}>
          <meta.Icon size={14} weight="fill" />
          {meta.label}
        </div>
      </div>
    </div>
  )
}