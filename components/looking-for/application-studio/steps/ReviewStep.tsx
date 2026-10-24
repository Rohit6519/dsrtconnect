'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PaperPlaneTilt, CheckCircle, CircleNotch } from '@phosphor-icons/react'
import { AppStepFooter } from './AppStepFooter'
import { useAppStudio } from '../AppStudioContext'
import { SubmissionChecklist } from './parts/SubmissionChecklist'

export function ReviewStep() {
  const { draft, setStep, flushSave } = useAppStudio()
  const router = useRouter()
  const app = draft.application
  const opp = draft.opportunity

  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<any[] | null>(null)

  const handleSubmit = async () => {
    setSubmitting(true)
    setErrors(null)
    try {
      await flushSave()
      const res = await fetch(`/api/opportunities/applications/${app.id}/submit`, { method: 'POST' })
      const d = await res.json()
      
      if (!res.ok) {
        if (d.errors && Array.isArray(d.errors)) {
          setErrors(d.errors)
        } else {
          alert(d.error || 'Submission failed')
        }
        setSubmitting(false)
        return
      }

      // Success — redirect to My Applications dashboard scoped to this app
      router.push(`/looking-for/my-applications?app=${app.id}`)
    } catch (e: any) {
      alert(e?.message || 'Submission failed')
      setSubmitting(false)
    }
  }

  const snapshot = app.applicant_snapshot || {}
  const name = snapshot.full_name || snapshot.username || 'Applicant'

  return (
    <>
      <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-8">
        
        {/* Main Content */}
        <div className="space-y-6">
          <div>
            <h2 className="text-[20px] font-bold text-white mb-1">Final Review</h2>
            <p className="text-[12.5px] text-zinc-500">
              This is exactly what the employer will see. Check your answers before submitting.
            </p>
          </div>

          {errors && errors.length > 0 && (
            <div className="rounded-2xl border border-red-500/25 bg-red-500/[0.05] p-5">
              <div className="text-[13px] font-bold text-red-200 mb-2">Submission blocked. Missing requirements:</div>
              <ul className="space-y-1.5">
                {errors.map((err: any, i: number) => (
                  <li key={i} className="flex items-center gap-2 text-[12.5px] text-red-300">
                    <span className="w-1 h-1 rounded-full bg-red-400" />
                    <span>{err.message}</span>
                    <button
                      onClick={() => setStep(err.step)}
                      className="text-red-200 hover:text-white underline underline-offset-2 text-[11.5px] font-semibold ml-1"
                    >
                      Fix issue →
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Application Preview */}
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/40 p-6 md:p-8 space-y-8">
            
            {/* Applicant Profile Head */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 overflow-hidden flex items-center justify-center text-[15px] font-bold text-zinc-500">
                {snapshot.avatar_url ? (
                  <img src={snapshot.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  name.charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <h3 className="text-[16px] font-bold text-white">{name}</h3>
                <p className="text-[13px] text-zinc-400">{snapshot.tagline || ''}</p>
              </div>
            </div>

            {/* Highlighted Skills */}
            {(app.highlighted_skills || []).length > 0 && (
              <div>
                <div className="text-[10.5px] font-bold uppercase tracking-wider text-zinc-500 mb-2">Highlighted Skills</div>
                <div className="flex flex-wrap gap-2">
                  {app.highlighted_skills.map((s: string) => (
                    <span key={s} className="h-7 px-3 rounded-lg border border-emerald-500/25 bg-emerald-500/[0.08] text-emerald-300 text-[12px] font-medium inline-flex items-center">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Availability */}
            {(app.availability || app.expected_hours || app.proposed_compensation) && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 border-y border-zinc-800/60 py-5">
                {app.availability && (
                  <div>
                    <div className="text-[10.5px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Start Date</div>
                    <div className="text-[13px] text-white font-medium capitalize">{app.availability.replace(/_/g, ' ')}</div>
                  </div>
                )}
                {app.expected_hours && (
                  <div>
                    <div className="text-[10.5px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Commitment</div>
                    <div className="text-[13px] text-white font-medium">{app.expected_hours} hrs/wk</div>
                  </div>
                )}
                {app.proposed_compensation && (
                  <div>
                    <div className="text-[10.5px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Proposed Comp</div>
                    <div className="text-[13px] text-white font-medium">
                      {app.proposed_compensation_currency || 'USD'} {app.proposed_compensation}
                      {app.proposed_compensation_type ? (
                        <span className="capitalize text-zinc-400 text-[12px] ml-0.5">
                          ({app.proposed_compensation_type})
                        </span>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Messages / Questions */}
            <div className="space-y-6">
              {app.cover_message && (
                <div>
                  <div className="text-[10.5px] font-bold uppercase tracking-wider text-zinc-500 mb-2">Message</div>
                  <p className="text-[13px] text-zinc-300 leading-relaxed whitespace-pre-wrap">{app.cover_message}</p>
                </div>
              )}
              {app.cover_letter && (
                <div>
                  <div className="text-[10.5px] font-bold uppercase tracking-wider text-zinc-500 mb-2">Relevant Experience</div>
                  <p className="text-[13px] text-zinc-300 leading-relaxed whitespace-pre-wrap">{app.cover_letter}</p>
                </div>
              )}
              
              {/* Render custom questions & answers */}
              {(draft.questions || []).map((q: any, i: number) => {
                const ans = (app.answers || {})[q.id]
                if (ans === undefined || ans === null || ans === '') return null
                return (
                  <div key={q.id}>
                    <div className="text-[12px] font-semibold text-zinc-400 mb-1">Q{i+1}. {q.label}</div>
                    <div className="text-[13.5px] text-white whitespace-pre-wrap">
                      {Array.isArray(ans) ? ans.join(', ') : String(ans)}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Submission Action Box */}
          <div className="rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-[#18181b] via-[#121215] to-[#0f0f11] p-5 md:p-6 flex items-center justify-between">
            <div>
              <div className="text-[14px] font-bold text-white mb-1">Ready to submit?</div>
              <div className="text-[12px] text-zinc-500">
                Your application will be sent securely to the employer.
              </div>
            </div>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex items-center gap-2 h-11 px-6 rounded-xl bg-white text-black hover:bg-zinc-200 text-[13px] font-bold shadow-[0_2px_16px_rgba(255,255,255,0.15)] disabled:opacity-60 transition-all"
            >
              {submitting ? (
                <CircleNotch size={14} className="animate-spin" />
              ) : (
                <PaperPlaneTilt size={14} weight="bold" />
              )}
              {submitting ? 'Sending...' : 'Submit Application'}
            </button>
          </div>

        </div>

        {/* Sidebar */}
        <div className="hidden lg:block">
          <div className="sticky top-[100px] space-y-4">
            <SubmissionChecklist onJumpTo={setStep} />
            
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/40 p-5">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500 mb-3">After Submission</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-2 text-[12px] text-zinc-400">
                  <CheckCircle size={14} weight="fill" className="text-zinc-600 mt-0.5 shrink-0" />
                  <span>The employer will be notified immediately.</span>
                </li>
                <li className="flex items-start gap-2 text-[12px] text-zinc-400">
                  <CheckCircle size={14} weight="fill" className="text-zinc-600 mt-0.5 shrink-0" />
                  <span>You can track status in your <strong className="text-zinc-300 font-semibold">My Applications</strong> dashboard.</span>
                </li>
                <li className="flex items-start gap-2 text-[12px] text-zinc-400">
                  <CheckCircle size={14} weight="fill" className="text-zinc-600 mt-0.5 shrink-0" />
                  <span>Messages from the team will appear in your Inbox.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

      </div>

      <AppStepFooter prev="evidence" />
    </>
  )
}