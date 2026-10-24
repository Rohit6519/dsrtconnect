'use client'

import { useAssessment } from '../AssessmentContext'
import { AssessmentStepFooter } from '../AssessmentStepFooter'
import { StepHeader } from './StepHeader'
import { FieldLabel } from '../shared/FieldLabel'
import { FieldHint } from '../shared/FieldHint'
import { TextAreaField } from '../shared/TextAreaField'
import { SelectField } from '../shared/SelectField'
import { ChipsField } from '../shared/ChipsField'
import { IMPACT_TAG_OPTIONS, DISCOVERY_SOURCE_OPTIONS } from '../shared/assessment-constants'

export function Step02_Problem() {
  const { data, updateStepField } = useAssessment()
  if (!data) return null

  const s = data.steps.step2_problem || {}

  const canContinue = Boolean(
    s.problem_statement && s.problem_statement.length >= 20 &&
    s.affected_audience && s.affected_audience.length >= 5
  )

  return (
    <div>
      <StepHeader
        stepNumber={2}
        title="Before thinking about the solution, define the problem clearly."
        subtitle="The problem you solve is the foundation. Everything else is downstream of this."
      />

      {/* Problem statement */}
      <div className="mb-6">
        <FieldLabel required htmlFor="p-statement">
          What specific problem are you trying to solve?
        </FieldLabel>
        <FieldHint>One or two sentences. Concrete and specific.</FieldHint>
        <div className="mt-2">
          <TextAreaField
            id="p-statement"
            value={s.problem_statement || ''}
            maxLen={800}
            onChange={e => updateStepField(2, { problem_statement: e.target.value })}
            placeholder="Describe the exact problem — not the industry, not the trend."
            rows={4}
          />
        </div>
      </div>

      {/* Affected audience */}
      <div className="mb-6">
        <FieldLabel required htmlFor="p-audience">
          Who experiences this problem most strongly?
        </FieldLabel>
        <FieldHint>
          A specific first target — not &ldquo;everyone.&rdquo; Name the person or role.
        </FieldHint>
        <div className="mt-2">
          <TextAreaField
            id="p-audience"
            value={s.affected_audience || ''}
            maxLen={500}
            onChange={e => updateStepField(2, { affected_audience: e.target.value })}
            placeholder="e.g. Small-clinic operations managers with 5–15 staff and no dedicated IT."
            rows={3}
          />
        </div>
      </div>

      {/* Problem context */}
      <div className="mb-6">
        <FieldLabel htmlFor="p-context">When does this problem occur?</FieldLabel>
        <FieldHint>
          Describe a real situation where someone encounters the problem.
        </FieldHint>
        <div className="mt-2">
          <TextAreaField
            id="p-context"
            value={s.problem_context || ''}
            maxLen={800}
            onChange={e => updateStepField(2, { problem_context: e.target.value })}
            placeholder="Paint a scene. Where are they, what are they trying to do, what breaks?"
            rows={4}
          />
        </div>
      </div>

      {/* Impact tags */}
      <div className="mb-6">
        <FieldLabel>What happens because this problem exists?</FieldLabel>
        <FieldHint>Select all that apply.</FieldHint>
        <div className="mt-3">
          <ChipsField
            options={IMPACT_TAG_OPTIONS}
            value={s.impact_tags || []}
            onChange={(next) => updateStepField(2, { impact_tags: next })}
          />
        </div>
      </div>

      {/* Impact explanation */}
      <div className="mb-6">
        <FieldLabel htmlFor="p-impact">Explain the impact in your own words.</FieldLabel>
        <div className="mt-2">
          <TextAreaField
            id="p-impact"
            value={s.impact_explanation || ''}
            maxLen={800}
            onChange={e => updateStepField(2, { impact_explanation: e.target.value })}
            placeholder="What does the person lose, feel, or miss when this problem stays unsolved?"
            rows={4}
          />
        </div>
      </div>

      {/* Discovery source */}
      <div className="mb-6">
        <FieldLabel htmlFor="p-source">How did you discover this problem?</FieldLabel>
        <div className="mt-2">
          <SelectField
            id="p-source"
            value={s.discovery_source || ''}
            onChange={e => updateStepField(2, { discovery_source: e.target.value })}
            options={DISCOVERY_SOURCE_OPTIONS}
            placeholder="Choose one..."
          />
        </div>
      </div>

      {/* Discovery details */}
      <div className="mb-6">
        <FieldLabel htmlFor="p-details">Tell us what you discovered.</FieldLabel>
        <div className="mt-2">
          <TextAreaField
            id="p-details"
            value={s.discovery_details || ''}
            maxLen={800}
            onChange={e => updateStepField(2, { discovery_details: e.target.value })}
            placeholder="Specific moments, conversations, or observations that made the problem real to you."
            rows={4}
          />
        </div>
      </div>

      <AssessmentStepFooter canContinue={canContinue} />
    </div>
  )
}