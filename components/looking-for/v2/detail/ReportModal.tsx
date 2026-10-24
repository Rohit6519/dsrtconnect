'use client'

import { useEffect, useState } from 'react'
import { X, Warning, CheckCircle } from '@phosphor-icons/react'

interface Props {
  opportunity: any
  onClose: () => void
}

const REASONS = [
  { value: 'spam', label: 'Spam or fake' },
  { value: 'misleading', label: 'Misleading information' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'fraudulent', label: 'Fraudulent / scam' },
  { value: 'impersonation', label: 'Impersonation' },
  { value: 'irrelevant', label: 'Irrelevant to platform' },
  { value: 'suspicious-compensation', label: 'Suspicious compensation' },
  { value: 'other', label: 'Other' },
]

export function ReportModal({ opportunity, onClose }: Props) {
  const [reason, setReason] = useState<string>('')
  const [details, setDetails] = useState('')
  const [step, setStep] = useState<'form' | 'submitting' | 'success' | 'error'>('form')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && step !== 'submitting' && onClose()
    window.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [onClose, step])

  const submit = async () => {
    if (!reason) return
    setStep('submitting')
    setErrorMsg(null)
    try {
      const res = await fetch(`/api/opportunities/${opportunity.id}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, details: details.trim() || null }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to submit report')
      }
      setStep('success')
      setTimeout(onClose, 1500)
    } catch (e: any) {
      setErrorMsg(e.message || 'Something went wrong')
      setStep('error')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={step !== 'submitting' ? onClose : undefined}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-[#0a0a0a] overflow-hidden shadow-[0_20px_80px_rgba(0,0,0,0.6)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h2 className="text-[15px] font-bold text-white">Report opportunity</h2>
          <button
            onClick={onClose}
            disabled={step === 'submitting'}
            className="w-7 h-7 rounded-md flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-900 disabled:opacity-40"
          >
            <X size={13} weight="bold" />
          </button>
        </div>

        {step === 'success' ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <CheckCircle size={20} weight="fill" />
            </div>
            <h3 className="text-[15px] font-bold text-white mb-1">Report submitted</h3>
            <p className="text-[12.5px] text-zinc-500">Our team will review this shortly.</p>
          </div>
        ) : (
          <>
            <div className="p-6 space-y-4">
              <p className="text-[12.5px] text-zinc-400 leading-relaxed">
                Help us keep DSRT professional. Choose the reason that best describes the issue.
              </p>

              <div className="space-y-1.5">
                {REASONS.map(r => (
                  <label key={r.value} className="flex items-center gap-2.5 py-1.5 cursor-pointer group">
                    <input
                      type="radio"
                      name="reason"
                      value={r.value}
                      checked={reason === r.value}
                      onChange={(e) => setReason(e.target.value)}
                      disabled={step === 'submitting'}
                      className="w-3.5 h-3.5 accent-white"
                    />
                    <span className={
                      'text-[13px] ' +
                      (reason === r.value ? 'text-white font-medium' : 'text-zinc-400 group-hover:text-zinc-200')
                    }>
                      {r.label}
                    </span>
                  </label>
                ))}
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                  Additional details (optional)
                </label>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={3}
                  placeholder="Provide any context..."
                  disabled={step === 'submitting'}
                  className="w-full px-3 py-2.5 rounded-md bg-zinc-950 border border-zinc-800 text-[13px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 resize-none leading-relaxed"
                />
              </div>

              {errorMsg && (
                <div className="flex items-start gap-2 p-3 rounded-md border border-red-500/30 bg-red-500/5 text-[12px] text-red-400">
                  <Warning size={13} weight="fill" className="shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 px-6 py-4 border-t border-zinc-800">
              <button
                onClick={onClose}
                disabled={step === 'submitting'}
                className="h-9 px-4 rounded-md border border-zinc-800 hover:border-zinc-700 text-[12.5px] font-medium text-zinc-300 hover:text-white disabled:opacity-40 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={!reason || step === 'submitting'}
                className="h-9 px-4 rounded-md bg-red-600 hover:bg-red-500 text-white text-[12.5px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {step === 'submitting' ? 'Submitting...' : 'Submit report'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}