'use client'

import { Info, Sparkle } from '@phosphor-icons/react'

export function NextActionBanner({
  application, interviews, onOpenAvailability,
}: { application: any; interviews: any[]; onOpenAvailability: () => void }) {
  const stage = application.pipeline_stage
  const unscheduledInterview = interviews.find((iv: any) => !iv.scheduled_at && iv.status !== 'cancelled')
  const upcomingInterview = interviews.find((iv: any) => iv.scheduled_at && iv.status === 'confirmed' && new Date(iv.scheduled_at) > new Date())

  let title = ''
  let hint = ''
  let cta: { label: string; onClick: () => void } | null = null

  if (stage === 'draft') {
    title = 'Complete your application'
    hint = 'You started but haven\'t submitted yet.'
  } else if (stage === 'rejected') {
    title = 'This opportunity is closed for you'
    hint = 'The team decided to move forward with other candidates.'
  } else if (stage === 'hired') {
    title = 'You\'ve been selected — congratulations'
    hint = 'The team will reach out about onboarding.'
  } else if (unscheduledInterview) {
    title = 'The team wants to interview you'
    hint = 'Share your availability so they can propose a time.'
    cta = { label: 'Share availability', onClick: onOpenAvailability }
  } else if (upcomingInterview) {
    title = 'Upcoming interview'
    hint = `${new Date(upcomingInterview.scheduled_at).toLocaleString()}. Check the interview card below.`
  } else if (stage === 'screening') {
    title = 'You\'ve been shortlisted'
    hint = 'Standing by for next steps from the team.'
  } else if (stage === 'reviewing') {
    title = 'Your application is under review'
    hint = 'We\'ll ping you the moment there\'s an update.'
  } else if (stage === 'offered') {
    title = 'Offer is being prepared'
    hint = 'Full offer details will arrive in your inbox.'
  } else if (['submitted', 'applied', 'pending'].includes(stage)) {
    title = 'Application submitted'
    hint = 'You\'re in the queue — the team will review shortly.'
  } else {
    return null
  }

  return (
    <div className="rounded-2xl border border-blue-500/25 bg-gradient-to-b from-blue-500/[0.08] to-[#0f0f11] p-5 flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg bg-blue-500/15 border border-blue-500/25 flex items-center justify-center shrink-0">
        <Sparkle size={16} weight="fill" className="text-blue-300" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13.5px] font-bold text-white">{title}</div>
        <div className="text-[12px] text-zinc-400 mt-0.5">{hint}</div>
      </div>
      {cta && (
        <button
          onClick={cta.onClick}
          className="shrink-0 inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-white text-black hover:bg-zinc-200 text-[12.5px] font-bold transition-colors"
        >
          {cta.label}
        </button>
      )}
    </div>
  )
}