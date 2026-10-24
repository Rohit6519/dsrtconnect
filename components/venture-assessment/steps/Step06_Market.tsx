'use client'

import { useAssessment } from '../AssessmentContext'
import { AssessmentStepFooter } from '../AssessmentStepFooter'
import { StepHeader } from './StepHeader'
import { FieldLabel } from '../shared/FieldLabel'
import { FieldHint } from '../shared/FieldHint'
import { TextField } from '../shared/TextField'
import { TextAreaField } from '../shared/TextAreaField'
import { ChipsField } from '../shared/ChipsField'
import { DISTRIBUTION_CHANNEL_OPTIONS } from '../shared/assessment-constants'

export function Step06_Market() {
  const { data, updateStepField } = useAssessment()
  if (!data) return null

  const s = data.steps.step6_market || {}

  const canContinue = Boolean(
    s.initial_market && s.initial_market.length >= 10
  )

  return (
    <div>
      <StepHeader
        stepNumber={6}
        title="Now move outward from your first customer."
        subtitle="Market size matters, but reasoning matters more. Show us how you think, not just what you claim."
      />

      <div className="mb-6">
        <FieldLabel required htmlFor="m-initial">Who is your initial market?</FieldLabel>
        <FieldHint>
          The concrete group you are actually going after in the first 12 months.
        </FieldHint>
        <div className="mt-2">
          <TextAreaField
            id="m-initial"
            value={s.initial_market || ''}
            maxLen={800}
            onChange={e => updateStepField(6, { initial_market: e.target.value })}
            rows={3}
            placeholder="e.g. Early-stage B2B SaaS companies in North America with 10–50 employees."
          />
        </div>
      </div>

      <div className="mb-6">
        <FieldLabel htmlFor="m-size">How many potential customers or users are in that market?</FieldLabel>
        <FieldHint>Number, order of magnitude, or a rough range is fine.</FieldHint>
        <div className="mt-2">
          <TextField
            id="m-size"
            value={s.market_size_estimate || ''}
            maxLength={200}
            onChange={e => updateStepField(6, { market_size_estimate: e.target.value })}
            placeholder="e.g. ~40,000 companies, or $2B annual spend in this category"
          />
        </div>
      </div>

      <div className="mb-6">
        <FieldLabel htmlFor="m-method">How did you estimate that?</FieldLabel>
        <FieldHint>
          The methodology matters more than the number. Show your work.
        </FieldHint>
        <div className="mt-2">
          <TextAreaField
            id="m-method"
            value={s.estimation_methodology || ''}
            maxLen={1200}
            onChange={e => updateStepField(6, { estimation_methodology: e.target.value })}
            rows={4}
            placeholder="Explain your data sources, assumptions, and how you arrived at the estimate."
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <FieldLabel htmlFor="m-serviceable">Serviceable market</FieldLabel>
          <FieldHint>The realistic slice you can reach in 3–5 years.</FieldHint>
          <div className="mt-2">
            <TextAreaField
              id="m-serviceable"
              value={s.serviceable_market || ''}
              maxLen={500}
              onChange={e => updateStepField(6, { serviceable_market: e.target.value })}
              rows={3}
              placeholder="Optional but useful."
            />
          </div>
        </div>
        <div>
          <FieldLabel htmlFor="m-broader">Broader opportunity</FieldLabel>
          <FieldHint>What this expands into over the long term.</FieldHint>
          <div className="mt-2">
            <TextAreaField
              id="m-broader"
              value={s.broader_opportunity || ''}
              maxLen={500}
              onChange={e => updateStepField(6, { broader_opportunity: e.target.value })}
              rows={3}
              placeholder="Where does this go if it works?"
            />
          </div>
        </div>
      </div>

      <div className="mb-6">
        <FieldLabel>How do you expect to reach your first customers?</FieldLabel>
        <FieldHint>Select every channel you plan to use meaningfully.</FieldHint>
        <div className="mt-3">
          <ChipsField
            options={DISTRIBUTION_CHANNEL_OPTIONS}
            value={s.distribution_channels || []}
            onChange={(next) => updateStepField(6, { distribution_channels: next })}
          />
        </div>
      </div>

      <div className="mb-6">
        <FieldLabel htmlFor="m-rationale">Why do you believe this approach can work?</FieldLabel>
        <FieldHint>Not what you'll do — why it will work for this specific customer.</FieldHint>
        <div className="mt-2">
          <TextAreaField
            id="m-rationale"
            value={s.distribution_rationale || ''}
            maxLen={1000}
            onChange={e => updateStepField(6, { distribution_rationale: e.target.value })}
            rows={4}
            placeholder="Explain the mechanics — why this channel matches your customer's discovery habits."
          />
        </div>
      </div>

      <AssessmentStepFooter canContinue={canContinue} />
    </div>
  )
}