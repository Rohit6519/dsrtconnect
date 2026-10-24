'use client'

import { CheckCircle, WarningCircle, ArrowRight } from '@phosphor-icons/react'
import { useAppStudio, type AppStep } from '../../AppStudioContext'

interface CheckItem {
  ok: boolean
  label: string
  step: AppStep
}

export function SubmissionChecklist({ onJumpTo }: { onJumpTo: (step: AppStep) => void }) {
  const { draft } = useAppStudio()
  const app = draft.application
  const opp = draft.opportunity
  const questions = draft.questions || []
  const answers = app.answers || {}

  // Calculate missing required questions
  let missingQuestions = 0
  questions.forEach((q: any) => {
    if (q.is_required) {
      // Evaluate conditions
      let isVisible = true
      if (q.conditions?.show_if?.question_id) {
        const c = q.conditions.show_if
        const parentAns = String(answers[c.question_id] || '').toLowerCase()
        const valStr = String(c.value).toLowerCase()
        if (c.operator === 'equals' && parentAns !== valStr) isVisible = false
        if (c.operator === 'not_equals' && parentAns === valStr) isVisible = false
        if (c.operator === 'contains' && !parentAns.includes(valStr)) isVisible = false
      }

      if (isVisible) {
        const ans = answers[q.id]
        const isAnswered = ans !== undefined && ans !== null && ans !== '' && (Array.isArray(ans) ? ans.length > 0 : true)
        if (!isAnswered) missingQuestions++
      }
    }
  })

  const checks: CheckItem[] = []

  // Default Attachment Checks
  if (opp.require_resume) checks.push({ ok: !!app.resume_url, label: 'Resume URL', step: 'evidence' })
  if (opp.require_portfolio) checks.push({ ok: !!(app.portfolio_url || app.website_url), label: 'Portfolio URL', step: 'evidence' })
  if (opp.require_github) checks.push({ ok: !!app.github_url, label: 'GitHub URL', step: 'evidence' })
  if (opp.require_cover_letter) checks.push({ ok: !!(app.cover_message || app.cover_letter), label: 'Intro Message', step: 'evidence' })

  // Question Checks
  const reqQCount = questions.filter((q: any) => q.is_required).length
  if (reqQCount > 0) {
    checks.push({
      ok: missingQuestions === 0,
      label: missingQuestions > 0 ? `${missingQuestions} Required Question(s) missing` : 'All Required Questions Answered',
      step: 'questions'
    })
  }

  // Basic Profile Checks
  checks.push({ ok: (app.highlighted_skills || []).length > 0, label: 'Skills Highlighted', step: 'profile' })

  const failedChecks = checks.filter(c => !c.ok)
  const canPublish = failedChecks.length === 0

  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-[#18181b] via-[#121215] to-[#0f0f11] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.2)]">
      <div className="mb-4">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500 mb-1">Pre-flight Checklist</h3>
        <div className="text-[11.5px]">
          {canPublish ? (
            <span className="text-emerald-400 font-medium">Ready to submit. All requirements met.</span>
          ) : (
            <span className="text-amber-400 font-medium">{failedChecks.length} requirement{failedChecks.length > 1 ? 's' : ''} missing.</span>
          )}
        </div>
      </div>

      <ul className="space-y-2">
        {checks.map((item, i) => (
          <li key={i}>
            <button
              type="button"
              onClick={() => !item.ok && onJumpTo(item.step)}
              className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors text-left group ${
                item.ok 
                  ? 'border border-transparent cursor-default' 
                  : 'border border-zinc-800/60 bg-zinc-950/40 hover:bg-zinc-900/50 hover:border-zinc-700 cursor-pointer'
              }`}
            >
              {item.ok ? (
                <CheckCircle size={16} weight="fill" className="text-emerald-400 shrink-0" />
              ) : (
                <WarningCircle size={16} weight="fill" className="text-amber-400 shrink-0" />
              )}
              <span className={`text-[12.5px] font-semibold flex-1 ${item.ok ? 'text-zinc-500' : 'text-zinc-200'}`}>
                {item.label}
              </span>
              {!item.ok && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500 group-hover:text-white transition-colors">
                  {item.step} <ArrowRight size={10} weight="bold" />
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}