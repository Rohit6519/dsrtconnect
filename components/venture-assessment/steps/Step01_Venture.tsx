'use client'

import { useAssessment } from '../AssessmentContext'
import { AssessmentStepFooter } from '../AssessmentStepFooter'
import { StepHeader } from './StepHeader'
import { LogoUploader } from '../shared/LogoUploader'
import { FieldLabel } from '../shared/FieldLabel'
import { FieldHint } from '../shared/FieldHint'
import { TextField } from '../shared/TextField'
import { TextAreaField } from '../shared/TextAreaField'
import { SelectField } from '../shared/SelectField'
import { STAGE_OPTIONS, PRIMARY_SECTORS } from '../shared/assessment-constants'

export function Step01_Venture() {
  const { data, updateStepField } = useAssessment()
  if (!data) return null

  const s = data.steps.step1_venture || {}
  const venture = data.venture

  const canContinue = Boolean(s.name && s.stage && s.industry)

  return (
    <div>
      <StepHeader
        stepNumber={1}
        title="Let's start with what you are trying to create."
        subtitle="Just the identity of your venture. We refine everything else in the steps ahead."
      />

      {/* Logo */}
      <div className="mb-8">
        <FieldLabel>Company logo</FieldLabel>
        <FieldHint>
          Optional, but strongly recommended. A logo makes your venture instantly recognizable.
        </FieldHint>
        <div className="mt-3">
          <LogoUploader
            ventureId={venture.id}
            ventureSlug={venture.slug}
            ventureName={s.name}
            currentUrl={s.logo_url}
            onChange={(url: string | null) => updateStepField(1, { logo_url: url })}
          />
        </div>
      </div>

      {/* Venture name */}
      <div className="mb-6">
        <FieldLabel required htmlFor="v-name">Venture name</FieldLabel>
        <TextField
          id="v-name"
          value={s.name || ''}
          maxLength={120}
          onChange={e => updateStepField(1, { name: e.target.value })}
          placeholder="e.g. Rovonic Robotics"
        />
      </div>

      {/* Tagline */}
      <div className="mb-6">
        <FieldLabel htmlFor="v-tagline">One-line description</FieldLabel>
        <FieldHint>Describe what you are building in a single sentence.</FieldHint>
        <div className="mt-2">
          <TextAreaField
            id="v-tagline"
            value={s.tagline || ''}
            maxLen={200}
            onChange={e => updateStepField(1, { tagline: e.target.value })}
            placeholder="What do you do, for whom, and why does it matter?"
            rows={2}
          />
        </div>
      </div>

      {/* What are you building */}
      <div className="mb-6">
        <FieldLabel htmlFor="v-desc">What are you building?</FieldLabel>
        <FieldHint>
          Don&apos;t write a marketing pitch. Explain what you are actually creating in plain words.
        </FieldHint>
        <div className="mt-2">
          <TextAreaField
            id="v-desc"
            value={s.description || ''}
            maxLen={3000}
            onChange={e => updateStepField(1, { description: e.target.value })}
            placeholder="Describe the actual product, service, or platform you are building."
            rows={5}
          />
        </div>
      </div>

      {/* Stage + Sector row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div>
          <FieldLabel required htmlFor="v-stage">Venture stage</FieldLabel>
          <SelectField
            id="v-stage"
            value={s.stage || ''}
            onChange={e => updateStepField(1, { stage: e.target.value })}
            options={STAGE_OPTIONS}
            placeholder="Select stage..."
          />
        </div>
        <div>
          <FieldLabel required htmlFor="v-industry">Primary sector</FieldLabel>
          <SelectField
            id="v-industry"
            value={s.industry || ''}
            onChange={e => updateStepField(1, { industry: e.target.value })}
            options={PRIMARY_SECTORS}
            placeholder="Select sector..."
          />
        </div>
      </div>

      {/* Optional sub-category */}
      <div className="mb-6">
        <FieldLabel htmlFor="v-sub">Sub-category (optional)</FieldLabel>
        <FieldHint>A more specific niche within your sector.</FieldHint>
        <div className="mt-2">
          <TextField
            id="v-sub"
            value={s.sub_category || ''}
            maxLength={100}
            onChange={e => updateStepField(1, { sub_category: e.target.value })}
            placeholder="e.g. Robotics for elderly care"
          />
        </div>
      </div>

      <AssessmentStepFooter canContinue={canContinue} />
    </div>
  )
}