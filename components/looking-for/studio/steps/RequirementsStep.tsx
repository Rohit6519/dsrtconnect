// filepath: components/looking-for/studio/steps/RequirementsStep.tsx
'use client'

import { StepFooter } from './StepFooter'
import { SkillsRequirementCard } from './parts/SkillsRequirementCard'
import { CompensationCard } from './parts/CompensationCard'
import { AvailabilityCard } from './parts/AvailabilityCard'
import { TeamContextCard } from './parts/TeamContextCard'
import { TipBox } from './parts/TipBox'
import { useStudio } from '../StudioContext'

export function RequirementsStep() {
  const { draft } = useStudio()
  const opp = draft.opportunity
  const skills = draft.skill_requirements || []

  const requiredCount = skills.filter((s: any) => s.priority === 'required').length
  const preferredCount = skills.filter((s: any) => s.priority === 'preferred').length
  const optionalCount = skills.filter((s: any) => s.priority === 'optional').length

  return (
    <>
      <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-6 lg:gap-8">
        <div className="space-y-5 min-w-0">
          <div>
            <h2 className="text-[22px] font-bold text-white mb-1 tracking-tight">Requirements</h2>
            <p className="text-[13px] text-white/50">
              Who are you looking for, and what will they be doing?
            </p>
          </div>

          <SkillsRequirementCard />
          <CompensationCard />
          <AvailabilityCard />
          <TeamContextCard />
        </div>

        <div className="hidden lg:block">
          <div className="sticky top-[130px] space-y-4">
            <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-b from-[#141821] via-[#101319] to-[#0B0D13] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_4px_20px_rgba(0,0,0,0.3)]">
              <h3 className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#FBBF24] mb-4">
                Requirement summary
              </h3>
              <SummaryRow label="Required skills" value={requiredCount} highlight={requiredCount > 0} />
              <SummaryRow label="Preferred skills" value={preferredCount} />
              {optionalCount > 0 && <SummaryRow label="Optional skills" value={optionalCount} />}
              <div className="my-3 border-t border-white/[0.06]" />
              <SummaryRow label="Work mode" value={opp.work_mode || '—'} />
              <SummaryRow label="Time" value={opp.time_commitment || '—'} />
              <SummaryRow label="Length" value={opp.project_length || '—'} />
              <SummaryRow label="Positions" value={opp.positions_open || 1} />
              <div className="my-3 border-t border-white/[0.06]" />
              <SummaryRow label="Compensation" value={formatComp(opp)} />
              {opp.application_deadline && (
                <SummaryRow label="Deadline" value={new Date(opp.application_deadline).toLocaleDateString()} />
              )}
            </div>

            <TipBox variant="tips" title="Requirement Tips" items={[
              { title: 'Mark 1–3 as required', desc: 'Too many "required" skills scares off strong candidates who match most.' },
              { title: 'Be clear on comp', desc: 'Opportunities with visible compensation get 3× more applications.' },
            ]} />
          </div>
        </div>
      </div>
      <StepFooter prev="details" next="application" />
    </>
  )
}

function SummaryRow({ label, value, highlight }: { label: string; value: any; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center py-1.5 text-[12px]">
      <span className="text-white/45">{label}</span>
      <span className={
        highlight
          ? 'text-[#FBBF24] font-bold capitalize'
          : 'text-white/85 font-semibold capitalize'
      }>
        {String(value).replace(/-/g, ' ')}
      </span>
    </div>
  )
}

function formatComp(opp: any): string {
  const type = opp.compensation_type
  if (!type || type === 'unpaid') return 'Unpaid'
  if (type === 'collaboration') return 'Collaboration'
  if (type === 'equity') return opp.equity_min ? `${opp.equity_min}–${opp.equity_max}% equity` : 'Equity'
  const curr = opp.compensation_currency === 'USD' ? '$' : opp.compensation_currency || ''
  if (opp.compensation_min || opp.compensation_max) {
    const min = opp.compensation_min ? `${curr}${opp.compensation_min.toLocaleString()}` : ''
    const max = opp.compensation_max ? `${curr}${opp.compensation_max.toLocaleString()}` : ''
    let period = ''
    if (type === 'hourly') period = '/hr'
    else if (type === 'monthly') period = '/mo'
    else if (type === 'annual') period = '/yr'
    return `${min}${max ? ` – ${max}` : ''}${period}`
  }
  return type.replace(/-/g, ' ')
}