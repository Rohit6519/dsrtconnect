'use client'

import { useAppStudio } from '../AppStudioContext'
import { AppStepFooter } from './AppStepFooter'
import { QuestionRenderer } from './parts/QuestionRenderer'
import { CheckCircle } from '@phosphor-icons/react'

// Evaluate conditions set by the employer (e.g. "Only show Q3 if Q1 = 'Yes'")
function evaluateCondition(condition: any, answers: Record<string, any>): boolean {
  if (!condition || !condition.question_id) return true

  const { question_id, operator, value } = condition
  const answer = answers[question_id]
  
  if (answer === undefined || answer === null || answer === '') return false

  const ansStr = String(answer).toLowerCase()
  const valStr = String(value).toLowerCase()

  if (operator === 'equals') return ansStr === valStr
  if (operator === 'not_equals') return ansStr !== valStr
  if (operator === 'contains') {
    if (Array.isArray(answer)) return answer.some(a => String(a).toLowerCase().includes(valStr))
    return ansStr.includes(valStr)
  }

  return true
}

export function QuestionsStep() {
  const { draft, updateField } = useAppStudio()
  const questions = draft.questions || []
  const answers = draft.application.answers || {}

  // Determine which questions are actually visible based on logic
  const visibleQuestions = questions.filter((q: any) => evaluateCondition(q.conditions?.show_if, answers))

  const handleAnswer = (qId: string, val: any) => {
    updateField({ answers: { ...answers, [qId]: val } })
  }

  // Count progress
  let requiredCount = 0
  let answeredRequired = 0
  let totalAnswered = 0

  visibleQuestions.forEach((q: any) => {
    const isAnswered = answers[q.id] !== undefined && answers[q.id] !== null && answers[q.id] !== '' && (Array.isArray(answers[q.id]) ? answers[q.id].length > 0 : true)
    
    if (q.is_required) {
      requiredCount++
      if (isAnswered) answeredRequired++
    }
    if (isAnswered) totalAnswered++
  })

  const progress = requiredCount === 0 ? 100 : Math.round((answeredRequired / requiredCount) * 100)

  return (
    <>
      <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-8">
        
        {/* Main Content */}
        <div className="space-y-6">
          <div>
            <h2 className="text-[20px] font-bold text-white mb-1">Application Questions</h2>
            <p className="text-[12.5px] text-zinc-500">
              The poster requires specific answers to these questions to evaluate your fit.
            </p>
          </div>

          {questions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-800 p-12 text-center bg-gradient-to-b from-zinc-900/20 to-transparent">
              <CheckCircle size={28} weight="fill" className="text-zinc-600 mx-auto mb-3" />
              <div className="text-[15px] font-bold text-white mb-1">No custom questions</div>
              <p className="text-[13px] text-zinc-500">
                This opportunity does not require any custom questionnaire. You can proceed to the next step.
              </p>
            </div>
          ) : visibleQuestions.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/40 p-8 text-center text-zinc-500 text-[13px]">
              No questions visible based on your previous answers.
            </div>
          ) : (
            <div className="space-y-5">
              {visibleQuestions.map((q: any, i: number) => {
                const val = answers[q.id]
                return (
                  <div key={q.id} className="rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-[#18181b] via-[#121215] to-[#0f0f11] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-6 h-6 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-400 shrink-0 mt-0.5">
                        {i + 1}
                      </div>
                      <div className="min-w-0">
                        <label className="text-[14px] font-bold text-white leading-snug flex items-center flex-wrap gap-2">
                          {q.label}
                          {q.is_required && (
                            <span className="text-[9px] text-red-400 uppercase tracking-widest bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20 font-bold shrink-0">
                              Required
                            </span>
                          )}
                        </label>
                        {q.description && (
                          <p className="text-[12px] text-zinc-500 mt-1 leading-relaxed">
                            {q.description}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="pl-10">
                      <QuestionRenderer 
                        question={q} 
                        value={val} 
                        onChange={(v) => handleAnswer(q.id, v)} 
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Contextual Sidebar */}
        <div className="hidden lg:block">
          <div className="sticky top-[100px] space-y-4">
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/40 p-5 shadow-[0_4px_24px_rgba(0,0,0,0.2)]">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500 mb-4">Progress</h3>
              
              <div className="flex items-center justify-between text-[12px] font-semibold mb-2">
                <span className="text-white">{progress}% Completed</span>
                <span className="text-zinc-500">{answeredRequired} of {requiredCount} required</span>
              </div>
              
              <div className="h-1.5 rounded-full bg-zinc-900 overflow-hidden mb-4">
                <div 
                  className="h-full bg-blue-500 transition-all duration-500 ease-out" 
                  style={{ width: `${progress}%` }} 
                />
              </div>

              <div className="border-t border-zinc-800/70 pt-3 flex justify-between items-center text-[12px]">
                <span className="text-zinc-500">Total answered</span>
                <span className="text-zinc-300 font-semibold">{totalAnswered}</span>
              </div>
            </div>
            
            {questions.length > 0 && (
              <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/40 p-5">
                <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500 mb-3">Tips</h3>
                <p className="text-[12px] text-zinc-400 leading-relaxed">
                  Your answers are autosaved as you type. If you close this window, you can resume later from your <strong className="text-zinc-200">My Applications</strong> dashboard.
                </p>
              </div>
            )}
          </div>
        </div>

      </div>

      <AppStepFooter prev="experience" next="evidence" />
    </>
  )
}