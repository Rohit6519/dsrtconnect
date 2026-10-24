// filepath: components/looking-for/studio/steps/WorkflowStep.tsx
'use client'

import { StepFooter } from './StepFooter'
import { PipelineTemplateCard } from './parts/PipelineTemplateCard'
import { ReviewersTeamCard } from './parts/ReviewersTeamCard'
import { TipBox } from './parts/TipBox'
import { useStudio } from '../StudioContext'

export function WorkflowStep() {
  const { draft } = useStudio()
  const oppId = draft.opportunity.id

  return (
    <>
      <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-6 lg:gap-8">
        <div className="space-y-5 min-w-0">
          <div>
            <h2 className="text-[24px] font-bold text-white mb-1.5 tracking-tight">Workflow</h2>
            <p className="text-[13px] text-white/50">
              Configure your applicant pipeline and invite teammates to help review.
            </p>
          </div>
          <PipelineTemplateCard />
          <ReviewersTeamCard opportunityId={oppId} />
        </div>
        <div className="hidden lg:block">
          <div className="sticky top-[130px] space-y-4">
            <TipBox
              variant="info"
              title="How this works"
              items={[
                { title: 'Stages', desc: 'The columns in your applicant Kanban board. Core stages stay locked so counters and history remain consistent.' },
                { title: 'Reviewer teammates', desc: 'See only applicants you explicitly assign to them, keeping hiring context private and focused.' },
              ]}
            />
          </div>
        </div>
      </div>
      <StepFooter prev="application" next="distribution" />
    </>
  )
}