'use client'

import { CheckCircle, WarningCircle, ArrowRight } from '@phosphor-icons/react'
import { useStudio } from '../../StudioContext'
import type { StudioStep } from '../../StudioContext'

interface CheckItem {
  ok: boolean
  label: string
  step: StudioStep
  required: boolean
}

export function CompletionChecklist({ onJumpTo }: { onJumpTo: (step: StudioStep) => void }) {
  const { draft } = useStudio()
  const opp = draft.opportunity
  const skills = draft.skill_requirements || []
  const questions = draft.application_questions || []
  const distribution = draft.distribution || []
  const media = draft.media || []

  const checks: CheckItem[] = [
    { ok: !!opp.title && opp.title !== 'Untitled opportunity', label: 'Title provided', step: 'basics', required: true },
    { ok: !!opp.opportunity_type, label: 'Opportunity type selected', step: 'basics', required: true },
    { ok: !!opp.primary_category_id, label: 'Category selected', step: 'basics', required: false },
    { ok: !!(opp.description || opp.content_text), label: 'Description written', step: 'details', required: true },
    { ok: media.length > 0, label: 'Media attached', step: 'details', required: false },
    { ok: skills.length > 0, label: 'At least one skill added', step: 'requirements', required: true },
    { ok: !!opp.work_mode, label: 'Work mode selected', step: 'requirements', required: true },
    { ok: !!opp.compensation_type, label: 'Compensation defined', step: 'requirements', required: true },
    { ok: !!opp.time_commitment, label: 'Time commitment set', step: 'requirements', required: false },
    { ok: questions.length > 0, label: 'Custom questions added', step: 'application', required: false },
    { ok: distribution.filter((d: any) => !d.destination_id).length > 0, label: 'Distribution surfaces configured', step: 'distribution', required: false },
  ]

  const requiredChecks = checks.filter((c) => c.required)
  const optionalChecks = checks.filter((c) => !c.required)
  const requiredPassed = requiredChecks.filter((c) => c.ok).length
  const canPublish = requiredPassed === requiredChecks.length

  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-[#18181b] via-[#121215] to-[#0f0f11] p-5 md:p-6">
      <div className="mb-5">
        <div className="text-[13px] font-bold text-white mb-1">Completion checklist</div>
        <div className="text-[11.5px] text-zinc-500">
          {canPublish ? (
            <span className="text-emerald-400 font-semibold">Ready to publish. All required fields complete.</span>
          ) : (
            <span>Complete {requiredChecks.length - requiredPassed} more required item{requiredChecks.length - requiredPassed !== 1 ? 's' : ''} to publish.</span>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <ChecklistGroup title="Required" items={requiredChecks} onJumpTo={onJumpTo} />
        <ChecklistGroup title="Recommended" items={optionalChecks} onJumpTo={onJumpTo} muted />
      </div>
    </div>
  )
}

function ChecklistGroup({ title, items, onJumpTo, muted }: { title: string, items: CheckItem[], onJumpTo: (s: StudioStep) => void, muted?: boolean }) {
  return (
    <div>
      <div className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-zinc-500 mb-2">{title}</div>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i}>
            <button
              type="button"
              onClick={() => onJumpTo(item.step)}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-zinc-800/60 bg-zinc-950/40 hover:bg-zinc-900/50 hover:border-zinc-700 transition-colors text-left group"
            >
              {item.ok ? (
                <CheckCircle size={16} weight="fill" className="text-emerald-400 shrink-0" />
              ) : (
                <WarningCircle size={16} weight="fill" className={muted ? 'text-zinc-600 shrink-0' : 'text-amber-400 shrink-0'} />
              )}
              <span className={
                'text-[13px] font-semibold flex-1 ' +
                (item.ok ? 'text-zinc-200' : muted ? 'text-zinc-400' : 'text-white')
              }>
                {item.label}
              </span>
              {!item.ok && (
                <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-zinc-400 group-hover:text-white transition-colors capitalize">
                  {item.step}
                  <ArrowRight size={10} weight="bold" />
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}