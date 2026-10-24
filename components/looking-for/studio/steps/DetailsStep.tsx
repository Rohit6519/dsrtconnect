// filepath: components/looking-for/studio/steps/DetailsStep.tsx
'use client'

import { StepFooter } from './StepFooter'
import { StudioRichEditor } from './parts/StudioRichEditor'
import { StudioMediaPanel } from './parts/StudioMediaPanel'
import { InfoTooltip } from './parts/InfoTooltip'
import { TipBox } from './parts/TipBox'

export function DetailsStep() {
  return (
    <>
      <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-6 lg:gap-8">
        <div className="space-y-6 min-w-0">
          <div>
            <h2 className="text-[22px] font-bold text-white mb-1 tracking-tight flex items-center">
              Details
              <InfoTooltip text="This text forms the main body of your opportunity page. Markdown formatting is supported." />
            </h2>
            <p className="text-[13px] text-white/50">
              Provide a comprehensive description of the opportunity, responsibilities, and goals.
            </p>
          </div>
          <StudioRichEditor />
        </div>

        <div className="space-y-4">
          <StudioMediaPanel />
          <TipBox
            variant="tips"
            title="Structure Tips"
            items={[
              { title: "Start with the 'Why'", desc: 'Explain why this role or project exists and the impact it will have.' },
              { title: 'Use clear headers', desc: "Break content into 'What you'll do', 'Who you are', and 'What we offer'." },
              { title: 'Be transparent', desc: 'Unclear expectations lead to dropped applications. Be explicit about day-to-day realities.' },
            ]}
          />
        </div>
      </div>
      <StepFooter prev="basics" next="requirements" />
    </>
  )
}