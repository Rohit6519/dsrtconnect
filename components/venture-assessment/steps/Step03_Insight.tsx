'use client'

import { useAssessment } from '../AssessmentContext'
import { AssessmentStepFooter } from '../AssessmentStepFooter'
import { StepHeader } from './StepHeader'
import { FieldLabel } from '../shared/FieldLabel'
import { FieldHint } from '../shared/FieldHint'
import { TextAreaField } from '../shared/TextAreaField'

export function Step03_Insight() {
  const { data, updateStepField } = useAssessment()
  if (!data) return null

  const s = data.steps.step3_insight || {}

  const canContinue = Boolean(s.why_worth_solving && s.why_worth_solving.length >= 20)

  return (
    <div>
      <StepHeader
        stepNumber={3}
        title="An idea becomes stronger when you understand why you believe it should exist."
        subtitle="Five short reflections that force you to sharpen your conviction."
      />

      <div className="mb-6">
        <FieldLabel required htmlFor="i-worth">
          Why do you believe this problem is worth solving?
        </FieldLabel>
        <FieldHint>What makes this urgent, important, or worth years of your life?</FieldHint>
        <div className="mt-2">
          <TextAreaField
            id="i-worth"
            value={s.why_worth_solving || ''}
            maxLen={1000}
            onChange={e => updateStepField(3, { why_worth_solving: e.target.value })}
            rows={4}
            placeholder="Explain why this matters — economically, socially, or personally."
          />
        </div>
      </div>

      <div className="mb-6">
        <FieldLabel htmlFor="i-observations">
          What have you observed that supports your belief?
        </FieldLabel>
        <FieldHint>Facts, patterns, conversations, or data points.</FieldHint>
        <div className="mt-2">
          <TextAreaField
            id="i-observations"
            value={s.supporting_observations || ''}
            maxLen={1000}
            onChange={e => updateStepField(3, { supporting_observations: e.target.value })}
            rows={4}
            placeholder="e.g. In 15 interviews with clinic managers, 12 said this task takes 3+ hours per week."
          />
        </div>
      </div>

      <div className="mb-6">
        <FieldLabel htmlFor="i-overlooked">
          What do you understand about this problem that others may overlook?
        </FieldLabel>
        <FieldHint>Your edge often lives in what you notice that others don&apos;t.</FieldHint>
        <div className="mt-2">
          <TextAreaField
            id="i-overlooked"
            value={s.overlooked_understanding || ''}
            maxLen={1000}
            onChange={e => updateStepField(3, { overlooked_understanding: e.target.value })}
            rows={4}
            placeholder="What is the counterintuitive truth here?"
          />
        </div>
      </div>

      <div className="mb-6">
        <FieldLabel htmlFor="i-evolved">
          What changed or evolved in your thinking after you started exploring this?
        </FieldLabel>
        <FieldHint>
          Founders who never update their thinking usually build the wrong thing.
        </FieldHint>
        <div className="mt-2">
          <TextAreaField
            id="i-evolved"
            value={s.evolved_thinking || ''}
            maxLen={1000}
            onChange={e => updateStepField(3, { evolved_thinking: e.target.value })}
            rows={4}
            placeholder="What did you initially believe that turned out to be wrong or incomplete?"
          />
        </div>
      </div>

      <div className="mb-6">
        <FieldLabel htmlFor="i-falsify">
          What evidence could prove your current assumption wrong?
        </FieldLabel>
        <FieldHint>
          Optional but strongly recommended — it signals intellectual honesty.
        </FieldHint>
        <div className="mt-2">
          <TextAreaField
            id="i-falsify"
            value={s.falsifiable_evidence || ''}
            maxLen={1000}
            onChange={e => updateStepField(3, { falsifiable_evidence: e.target.value })}
            rows={4}
            placeholder="What finding would make you reconsider or pivot?"
          />
        </div>
      </div>

      <AssessmentStepFooter canContinue={canContinue} />
    </div>
  )
}