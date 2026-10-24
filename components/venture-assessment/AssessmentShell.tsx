'use client'

import { AssessmentProvider, useAssessment } from './AssessmentContext'
import { AssessmentTopBar } from './AssessmentTopBar'
import { AssessmentStepNavigator } from './AssessmentStepNavigator'
import { AssessmentTipsCard } from './AssessmentTipsCard'
import { AssessmentStepRouter } from './AssessmentStepRouter'
import { CircleNotch } from '@phosphor-icons/react'

interface Props {
  slug: string
  step: number
}

export function AssessmentShell({ slug, step }: Props) {
  return (
    <AssessmentProvider slug={slug} initialStep={step}>
      <ShellBody />
    </AssessmentProvider>
  )
}

function ShellBody() {
  const { loading, error, data, currentStep } = useAssessment()

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] text-white flex items-center justify-center">
        <div className="inline-flex items-center gap-2 text-[13px] text-zinc-400">
          <CircleNotch size={16} className="animate-spin" />
          Loading assessment…
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#09090b] text-white flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <h2 className="text-[18px] font-bold text-white mb-2">
            Unable to load assessment
          </h2>
          <p className="text-[13px] text-zinc-400 mb-4">
            {error || 'Something went wrong. Please try again.'}
          </p>
          <a
            href="/ventures"
            className="inline-flex items-center h-9 px-4 rounded-md bg-white text-black text-[13px] font-semibold hover:bg-zinc-100"
          >
            Back to Ventures
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100">
      <AssessmentTopBar />

      <div className="max-w-[1200px] mx-auto px-6 py-8 md:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 lg:gap-12">

          {/* LEFT SIDEBAR */}
          <aside className="lg:sticky lg:top-24 lg:self-start space-y-5">
            <AssessmentStepNavigator />

            <StepTips step={currentStep} />

            <AssessmentTipsCard label="How we use this">
              <p>
                Your answers become the canonical source of truth for your
                venture page, Explore ranking, and investor discovery.
              </p>
              <p>
                Structured input (not free text) powers matching, recommendations,
                and community signals.
              </p>
            </AssessmentTipsCard>
          </aside>

          {/* MAIN CONTENT */}
          <main className="min-w-0">
            <AssessmentStepRouter />
          </main>
        </div>
      </div>
    </div>
  )
}

function StepTips({ step }: { step: number }) {
  const tips: Record<number, string[]> = {
    1: [
      'Pick a name you can stand behind for years.',
      'A one-line description forces clarity of thought.',
      'Choose the sector closest to your primary customer.',
    ],
    2: [
      'Describe the problem in one specific sentence.',
      'Name a real person who experiences it, not a generic segment.',
      'Ground it in a concrete situation, not an abstract theory.',
    ],
    3: [
      'Explain what you understand that others overlook.',
      'Include evidence from your own experience or research.',
      'Note what evidence would prove you wrong — it strengthens the case.',
    ],
    4: [
      'Pick your first real customer, not the entire market.',
      'Document every existing alternative you know of.',
      'Distinguish user, decision-maker, and buyer where relevant.',
    ],
    5: [
      'Describe what the user experiences, not features.',
      'The MVP is the smallest thing that proves the concept.',
      'Be honest about what is hard to build.',
    ],
    6: [
      'Explain how you estimated your market — not just the number.',
      'Distribution strategy matters more than raw market size.',
      'Rationale should be defensible to a skeptical investor.',
    ],
    7: [
      'Include indirect competitors and manual alternatives.',
      'Explain honestly why someone might reject you.',
      "Being new is fine — say what your edge will become.",
    ],
    8: [
      'Explain why you specifically want to solve this.',
      'Map team capabilities across product, sales, ops, etc.',
      'The most critical gap is often the most useful insight.',
    ],
    9: [
      'Every venture has assumptions — write them down.',
      'Rate honest confidence, not aspirational confidence.',
      'A testable assumption is a solvable one.',
    ],
    10: [
      'The next milestone should be provable in weeks, not months.',
      'Your 30-day focus is a commitment, not a wish list.',
      'Name the blocker most likely to stop you.',
    ],
  }

  const list = tips[step] || []

  return (
    <AssessmentTipsCard label={`Tips for step ${step}`}>
      <ul className="space-y-1.5 list-none">
        {list.map((t, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-zinc-600 mt-0.5">·</span>
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </AssessmentTipsCard>
  )
}