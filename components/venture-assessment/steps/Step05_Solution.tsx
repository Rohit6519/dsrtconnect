'use client'

import { useAssessment } from '../AssessmentContext'
import { AssessmentStepFooter } from '../AssessmentStepFooter'
import { StepHeader } from './StepHeader'
import { FieldLabel } from '../shared/FieldLabel'
import { FieldHint } from '../shared/FieldHint'
import { TextAreaField } from '../shared/TextAreaField'
import { ChipsField } from '../shared/ChipsField'
import { BUILD_RISK_OPTIONS } from '../shared/assessment-constants'
import { ArrowDown } from '@phosphor-icons/react'

export function Step05_Solution() {
  const { data, updateStepField } = useAssessment()
  if (!data) return null

  const s = data.steps.step5_solution || {}

  const canContinue = Boolean(
    s.solution_description && s.solution_description.length >= 20 &&
    s.mvp_definition && s.mvp_definition.length >= 10
  )

  return (
    <div>
      <StepHeader
        stepNumber={5}
        title="Now explain what you intend to build."
        subtitle="Describe the solution, how it maps to the problem, and the smallest version you could ship."
      />

      <div className="mb-6">
        <FieldLabel required htmlFor="s-desc">What is your solution?</FieldLabel>
        <div className="mt-2">
          <TextAreaField
            id="s-desc"
            value={s.solution_description || ''}
            maxLen={1500}
            onChange={e => updateStepField(5, { solution_description: e.target.value })}
            rows={5}
            placeholder="Describe what you are building at a high level — what it is and what it does."
          />
        </div>
      </div>

      <div className="mb-6">
        <FieldLabel htmlFor="s-how">How does it solve the specific problem you described?</FieldLabel>
        <FieldHint>Trace the line from the problem to the mechanism inside your solution.</FieldHint>
        <div className="mt-2">
          <TextAreaField
            id="s-how"
            value={s.how_it_solves_problem || ''}
            maxLen={1500}
            onChange={e => updateStepField(5, { how_it_solves_problem: e.target.value })}
            rows={5}
            placeholder="Explain the causal link — why does this actually fix the problem?"
          />
        </div>
      </div>

      {/* User flow builder */}
      <div className="mb-6">
        <FieldLabel>What happens from the user&apos;s perspective?</FieldLabel>
        <FieldHint>Walk through it as a sequence.</FieldHint>

        <div className="mt-3 space-y-2">
          <FlowRow
            label="Before using your solution"
            value={s.user_flow_before || ''}
            onChange={v => updateStepField(5, { user_flow_before: v })}
            placeholder="The user's current situation and pain."
          />
          <FlowArrow />
          <FlowRow
            label="User takes this action"
            value={s.user_flow_action || ''}
            onChange={v => updateStepField(5, { user_flow_action: v })}
            placeholder="What triggers them to use your product?"
          />
          <FlowArrow />
          <FlowRow
            label="Your product does this"
            value={s.user_flow_product || ''}
            onChange={v => updateStepField(5, { user_flow_product: v })}
            placeholder="The core mechanism your solution provides."
          />
          <FlowArrow />
          <FlowRow
            label="The user receives this outcome"
            value={s.user_flow_outcome || ''}
            onChange={v => updateStepField(5, { user_flow_outcome: v })}
            placeholder="The end state — what they achieve, feel, or gain."
          />
        </div>
      </div>

      <div className="mb-6">
        <FieldLabel required htmlFor="s-mvp">
          What is the smallest version you could build to test whether your idea works?
        </FieldLabel>
        <FieldHint>The MVP. The shortest path to real learning.</FieldHint>
        <div className="mt-2">
          <TextAreaField
            id="s-mvp"
            value={s.mvp_definition || ''}
            maxLen={1000}
            onChange={e => updateStepField(5, { mvp_definition: e.target.value })}
            rows={4}
            placeholder="Describe the smallest thing you can ship that would validate the core hypothesis."
          />
        </div>
      </div>

      <div className="mb-6">
        <FieldLabel>What is difficult about building this?</FieldLabel>
        <FieldHint>Select all that apply.</FieldHint>
        <div className="mt-3">
          <ChipsField
            options={BUILD_RISK_OPTIONS}
            value={s.build_risk_tags || []}
            onChange={(next) => updateStepField(5, { build_risk_tags: next })}
          />
        </div>
      </div>

      <div className="mb-6">
        <FieldLabel htmlFor="s-risk">Explain the hardest challenge.</FieldLabel>
        <div className="mt-2">
          <TextAreaField
            id="s-risk"
            value={s.build_risk_explanation || ''}
            maxLen={800}
            onChange={e => updateStepField(5, { build_risk_explanation: e.target.value })}
            rows={4}
            placeholder="What is genuinely hard here — technically, operationally, commercially?"
          />
        </div>
      </div>

      <AssessmentStepFooter canContinue={canContinue} />
    </div>
  )
}

// ─── Flow builder helpers ─────────────────────────────────────────

function FlowRow({
  label, value, onChange, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-[#121215] p-3.5">
      <p className="text-[10.5px] font-mono uppercase tracking-widest text-zinc-500 font-semibold mb-2">
        {label}
      </p>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={2}
        placeholder={placeholder}
        className="w-full bg-transparent text-[13.5px] text-white placeholder:text-zinc-600 focus:outline-none resize-none"
      />
    </div>
  )
}

function FlowArrow() {
  return (
    <div className="flex justify-center">
      <div className="w-6 h-6 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
        <ArrowDown size={11} className="text-zinc-500" />
      </div>
    </div>
  )
}