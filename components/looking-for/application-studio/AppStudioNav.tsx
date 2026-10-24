'use client'

import { useAppStudio, type AppStep } from './AppStudioContext'

const STEPS: { key: AppStep; label: string; index: number }[] = [
  { key: 'profile', label: 'Profile', index: 1 },
  { key: 'experience', label: 'Experience', index: 2 },
  { key: 'questions', label: 'Questions', index: 3 },
  { key: 'evidence', label: 'Evidence Mapping', index: 4 },
  { key: 'review', label: 'Review & Submit', index: 5 },
]

export function AppStudioNav() {
  const { step, setStep, draft } = useAppStudio()

  // Dynamic completion logic based on draft state and opp requirements
  const isComplete = (s: AppStep) => {
    const app = draft.application || {}
    const opp = draft.opportunity || {}
    const questions = draft.questions || []

    if (s === 'profile') {
      return true // Snapshot is always captured at init
    }
    
    if (s === 'experience') {
      // Complete if they interacted with any of the experience fields
      return !!(app.availability || app.expected_hours || app.proposed_compensation)
    }
    
    if (s === 'questions') {
      if (questions.length === 0) return true
      const requiredQs = questions.filter((q: any) => q.is_required)
      if (requiredQs.length === 0) return Object.keys(app.answers || {}).length > 0
      
      // Check if ALL required questions have answers
      const answers = app.answers || {}
      return requiredQs.every((q: any) => {
        const ans = answers[q.id]
        return ans !== undefined && ans !== null && ans !== '' && (Array.isArray(ans) ? ans.length > 0 : true)
      })
    }
    
    if (s === 'evidence') {
      let reqsMet = true
      if (opp.require_resume && !app.resume_url) reqsMet = false
      if (opp.require_portfolio && !app.portfolio_url && !app.website_url) reqsMet = false
      if (opp.require_github && !app.github_url) reqsMet = false
      if (opp.require_cover_letter && !app.cover_message && !app.cover_letter) reqsMet = false
      
      // If no hard requirements exist, consider it complete if they provided ANY evidence
      if (!opp.require_resume && !opp.require_portfolio && !opp.require_github && !opp.require_cover_letter) {
        return !!(app.resume_url || app.portfolio_url || app.github_url || app.website_url || app.cover_message || app.cover_letter)
      }
      return reqsMet
    }

    // Review step is never "complete" until submitted
    return false
  }

  return (
    <div className="flex items-center gap-2 -mb-px overflow-x-auto scrollbar-hide py-1">
      {STEPS.map((s) => {
        const isActive = step === s.key
        const complete = isComplete(s.key)
        return (
          <button
            key={s.key}
            onClick={() => setStep(s.key)}
            className={
              'relative flex items-center gap-2 py-3 px-4 text-[13px] font-semibold whitespace-nowrap transition-colors ' +
              (isActive ? 'text-white' : 'text-zinc-500 hover:text-zinc-200')
            }
          >
            <span
              className={
                'inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold transition-colors ' +
                (isActive
                  ? 'bg-white text-black'
                  : complete
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-zinc-900 text-zinc-500 border border-zinc-800')
              }
            >
              {complete && !isActive ? '✓' : s.index}
            </span>
            {s.label}
            {isActive && (
              <span className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-white" />
            )}
          </button>
        )
      })}
    </div>
  )
}