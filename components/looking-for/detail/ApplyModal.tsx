'use client'

import { useEffect, useState } from 'react'
import { X, PaperPlaneTilt, CheckCircle, Warning } from '@phosphor-icons/react'
import type { TeamUpItem } from '@/types/teamup'

interface Props {
  item: TeamUpItem
  onClose: () => void
  onSuccess: () => void
}

interface CustomQuestion {
  question: string
  required?: boolean
  type?: 'text' | 'textarea' | 'select'
  options?: string[]
}

export function ApplyModal({ item, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<'form' | 'submitting' | 'success' | 'error'>('form')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [coverLetter, setCoverLetter] = useState('')
  const [message, setMessage] = useState('')
  const [resumeUrl, setResumeUrl] = useState('')
  const [portfolioUrl, setPortfolioUrl] = useState('')
  const [githubUrl, setGithubUrl] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [availability, setAvailability] = useState('')
  const [expectedHours, setExpectedHours] = useState<string>('')
  const [answers, setAnswers] = useState<Record<string, string>>({})

  const customQuestions: CustomQuestion[] = (item.custom_questions || []).map((q: any) =>
    typeof q === 'string' ? { question: q } : q
  )

  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && step !== 'submitting' && onClose()
    window.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [onClose, step])

  const validate = (): string | null => {
    if (!message.trim() && !coverLetter.trim())
      return 'Please write a short introduction or cover letter.'
    for (let i = 0; i < customQuestions.length; i++) {
      const q = customQuestions[i]
      if (q.required && !answers[`q_${i}`]?.trim()) {
        return `Please answer: ${q.question}`
      }
    }
    return null
  }

  const submit = async () => {
    const err = validate()
    if (err) {
      setErrorMsg(err)
      return
    }
    setStep('submitting')
    setErrorMsg(null)

    try {
      const res = await fetch(`/api/looking-for/${item.source_id}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_type: item.source_type,
          message: message.trim() || null,
          cover_letter: coverLetter.trim() || null,
          resume_url: resumeUrl.trim() || null,
          portfolio_url: portfolioUrl.trim() || null,
          github_url: githubUrl.trim() || null,
          linkedin_url: linkedinUrl.trim() || null,
          availability: availability || null,
          expected_hours: expectedHours ? parseInt(expectedHours) : null,
          answers,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to submit application')
      }

      setStep('success')
      setTimeout(() => onSuccess(), 1400)
    } catch (e: any) {
      setErrorMsg(e.message || 'Something went wrong')
      setStep('error')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={step !== 'submitting' ? onClose : undefined}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-2xl max-h-[90vh] rounded-xl border border-zinc-800 bg-[#0a0a0a] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 shrink-0">
          <div>
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-zinc-500 mb-0.5">
              Apply to
            </div>
            <h2 className="text-[15px] font-semibold text-white line-clamp-1">
              {item.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={step === 'submitting'}
            className="w-7 h-7 rounded-md flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-900 disabled:opacity-40"
          >
            <X size={14} weight="bold" />
          </button>
        </div>

        {/* Body */}
        {step === 'success' ? (
          <div className="flex-1 flex flex-col items-center justify-center px-8 py-16 text-center">
            <div className="w-12 h-12 rounded-lg border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-4">
              <CheckCircle size={22} weight="fill" />
            </div>
            <h3 className="text-[16px] font-semibold text-white mb-1.5">Application submitted</h3>
            <p className="text-[13px] text-zinc-500 max-w-sm leading-relaxed">
              Your application has been sent. You'll be notified when the team responds.
            </p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {/* Introduction / message */}
              <Field
                label="Introduction"
                hint="Tell the team why you're interested in this opportunity."
                required
              >
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  placeholder="I'm interested because..."
                  className="w-full px-3 py-2.5 rounded-md bg-zinc-950 border border-zinc-800 text-[13.5px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 resize-none leading-relaxed"
                  disabled={step === 'submitting'}
                />
              </Field>

              {/* Cover letter */}
              <Field label="Relevant experience" hint="What have you built that is relevant?">
                <textarea
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  rows={4}
                  placeholder="Share projects, roles, or work that demonstrate your fit..."
                  className="w-full px-3 py-2.5 rounded-md bg-zinc-950 border border-zinc-800 text-[13.5px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 resize-none leading-relaxed"
                  disabled={step === 'submitting'}
                />
              </Field>

              {/* Availability */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Availability">
                  <select
                    value={availability}
                    onChange={(e) => setAvailability(e.target.value)}
                    disabled={step === 'submitting'}
                    className="w-full h-9 px-3 rounded-md bg-zinc-950 border border-zinc-800 text-[13px] text-zinc-200 focus:outline-none focus:border-zinc-700 cursor-pointer"
                  >
                    <option value="">Select...</option>
                    <option value="immediately">Immediately</option>
                    <option value="within_week">Within a week</option>
                    <option value="within_month">Within a month</option>
                    <option value="flexible">Flexible</option>
                  </select>
                </Field>

                <Field label="Hours per week">
                  <input
                    type="number"
                    min={1}
                    max={80}
                    value={expectedHours}
                    onChange={(e) => setExpectedHours(e.target.value)}
                    placeholder="e.g. 15"
                    disabled={step === 'submitting'}
                    className="w-full h-9 px-3 rounded-md bg-zinc-950 border border-zinc-800 text-[13px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700"
                  />
                </Field>
              </div>

              {/* Links */}
              <div>
                <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-zinc-500 mb-3">
                  Links (optional)
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <LinkField
                    placeholder="Resume URL"
                    value={resumeUrl}
                    onChange={setResumeUrl}
                    disabled={step === 'submitting'}
                  />
                  <LinkField
                    placeholder="Portfolio URL"
                    value={portfolioUrl}
                    onChange={setPortfolioUrl}
                    disabled={step === 'submitting'}
                  />
                  <LinkField
                    placeholder="GitHub URL"
                    value={githubUrl}
                    onChange={setGithubUrl}
                    disabled={step === 'submitting'}
                  />
                  <LinkField
                    placeholder="LinkedIn URL"
                    value={linkedinUrl}
                    onChange={setLinkedinUrl}
                    disabled={step === 'submitting'}
                  />
                </div>
              </div>

              {/* Custom questions */}
              {customQuestions.length > 0 && (
                <div>
                  <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-zinc-500 mb-3">
                    Application questions
                  </div>
                  <div className="space-y-4">
                    {customQuestions.map((q, i) => (
                      <Field
                        key={i}
                        label={q.question}
                        required={q.required}
                      >
                        <textarea
                          value={answers[`q_${i}`] || ''}
                          onChange={(e) => setAnswers({ ...answers, [`q_${i}`]: e.target.value })}
                          rows={3}
                          disabled={step === 'submitting'}
                          className="w-full px-3 py-2.5 rounded-md bg-zinc-950 border border-zinc-800 text-[13.5px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 resize-none leading-relaxed"
                        />
                      </Field>
                    ))}
                  </div>
                </div>
              )}

              {errorMsg && (
                <div className="flex items-start gap-2 p-3 rounded-md border border-red-500/30 bg-red-500/5 text-[12.5px] text-red-400">
                  <Warning size={14} weight="fill" className="shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-zinc-800 shrink-0">
              <button
                onClick={onClose}
                disabled={step === 'submitting'}
                className="h-9 px-3.5 rounded-md border border-zinc-800 hover:border-zinc-700 text-[13px] text-zinc-300 disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={step === 'submitting'}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-[13px] font-medium disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {step === 'submitting' ? (
                  <>
                    <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <PaperPlaneTilt size={13} weight="fill" />
                    Submit application
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Field({
  label, hint, required, children,
}: {
  label: string
  hint?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-[12.5px] font-medium text-zinc-300 mb-1.5">
        {label}
        {required && <span className="text-blue-400 ml-1">*</span>}
      </label>
      {hint && (
        <p className="text-[11.5px] text-zinc-500 mb-2 leading-relaxed">{hint}</p>
      )}
      {children}
    </div>
  )
}

function LinkField({
  placeholder, value, onChange, disabled,
}: {
  placeholder: string
  value: string
  onChange: (v: string) => void
  disabled?: boolean
}) {
  return (
    <input
      type="url"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full h-9 px-3 rounded-md bg-zinc-950 border border-zinc-800 text-[13px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700"
    />
  )
}
