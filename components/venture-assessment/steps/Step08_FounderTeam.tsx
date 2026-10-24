'use client'

import { useAssessment } from '../AssessmentContext'
import { AssessmentStepFooter } from '../AssessmentStepFooter'
import { StepHeader } from './StepHeader'
import { FieldLabel } from '../shared/FieldLabel'
import { FieldHint } from '../shared/FieldHint'
import { TextAreaField } from '../shared/TextAreaField'
import { CAPABILITY_AREAS, CAPABILITY_LEVEL_OPTIONS } from '../shared/assessment-constants'

export function Step08_FounderTeam() {
  const { data, updateStepField } = useAssessment()
  if (!data) return null

  const fa = data.steps.step8_founder_team.founder_answers || {}
  const cap = data.steps.step8_founder_team.capabilities || {}
  const capMap: Record<string, string> = cap.capability_map || {}

  const canContinue = Boolean(
    fa.why_solve_this && fa.why_solve_this.length >= 20
  )

  const setCapability = (key: string, level: string) => {
    const nextMap = { ...capMap, [key]: level }
    updateStepField(8, { capability_map: nextMap })
  }

  return (
    <div>
      <StepHeader
        stepNumber={8}
        title="Let's understand the people who need to make this happen."
        subtitle="Your relationship to the problem, your team's coverage map, and where you need help."
      />

      <div className="mb-8">
        <p className="text-[11px] font-mono uppercase tracking-widest text-zinc-500 font-semibold mb-3">
          About you as the founder
        </p>

        <div className="space-y-6">
          <div>
            <FieldLabel required htmlFor="f-why">Why do you want to solve this problem?</FieldLabel>
            <FieldHint>The real motivation — not the pitch answer.</FieldHint>
            <div className="mt-2">
              <TextAreaField
                id="f-why"
                value={fa.why_solve_this || ''}
                maxLen={1200}
                onChange={e => updateStepField(8, { why_solve_this: e.target.value })}
                rows={4}
                placeholder="Personal history, obsession, injustice you saw — whatever is honest."
              />
            </div>
          </div>

          <div>
            <FieldLabel htmlFor="f-exp">What experience or knowledge do you have in this area?</FieldLabel>
            <div className="mt-2">
              <TextAreaField
                id="f-exp"
                value={fa.relevant_experience || ''}
                maxLen={1200}
                onChange={e => updateStepField(8, { relevant_experience: e.target.value })}
                rows={4}
                placeholder="Prior work, education, projects, communities, unusual exposure."
              />
            </div>
          </div>

          <div>
            <FieldLabel htmlFor="f-adv">What gives you an advantage?</FieldLabel>
            <div className="mt-2">
              <TextAreaField
                id="f-adv"
                value={fa.founder_advantage || ''}
                maxLen={1000}
                onChange={e => updateStepField(8, { founder_advantage: e.target.value })}
                rows={4}
                placeholder="Unique access, unique conviction, unfair skill combination."
              />
            </div>
          </div>

          <div>
            <FieldLabel htmlFor="f-learn">What do you still need to learn?</FieldLabel>
            <FieldHint>
              Founders who can name their gaps are more likely to close them.
            </FieldHint>
            <div className="mt-2">
              <TextAreaField
                id="f-learn"
                value={fa.what_to_learn || ''}
                maxLen={1000}
                onChange={e => updateStepField(8, { what_to_learn: e.target.value })}
                rows={4}
                placeholder="Skills, domain knowledge, or relationships you're actively building."
              />
            </div>
          </div>
        </div>
      </div>

      {/* Capability grid */}
      <div className="mb-8">
        <p className="text-[11px] font-mono uppercase tracking-widest text-zinc-500 font-semibold mb-3">
          Team capability map
        </p>
        <FieldLabel>What is currently covered by your team?</FieldLabel>
        <FieldHint>Be realistic — this helps DSRT surface the right collaborators.</FieldHint>

        <div className="mt-4 rounded-xl border border-zinc-800 bg-[#121215] overflow-hidden">
          {CAPABILITY_AREAS.map((area, i) => (
            <div
              key={area.key}
              className={
                'flex items-center gap-3 px-4 py-3 ' +
                (i > 0 ? 'border-t border-zinc-800/80' : '')
              }
            >
              <span className="text-[13px] font-semibold text-white flex-1">{area.label}</span>
              <div className="flex items-center gap-1 bg-[#0a0a0f] border border-zinc-800 rounded-md p-0.5">
                {CAPABILITY_LEVEL_OPTIONS.map(opt => {
                  const active = capMap[area.key] === opt.value
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setCapability(area.key, opt.value)}
                      className={
                        'text-[11px] font-semibold px-2.5 h-6 rounded transition-colors ' +
                        (active
                          ? opt.value === 'covered'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : opt.value === 'partial'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-red-500/20 text-red-300'
                          : 'text-zinc-500 hover:text-white')
                      }
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <FieldLabel htmlFor="c-gap">
          What is the most important capability your venture currently lacks?
        </FieldLabel>
        <FieldHint>
          This becomes a signal for co-founder matching and role recommendations.
        </FieldHint>
        <div className="mt-2">
          <TextAreaField
            id="c-gap"
            value={cap.most_critical_gap || ''}
            maxLen={500}
            onChange={e => updateStepField(8, { most_critical_gap: e.target.value })}
            rows={3}
            placeholder="e.g. Enterprise sales experience, or hands-on ML systems engineering."
          />
        </div>
      </div>

      <AssessmentStepFooter canContinue={canContinue} />
    </div>
  )
}