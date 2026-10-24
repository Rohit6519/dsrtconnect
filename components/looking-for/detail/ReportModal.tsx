'use client'

import { useEffect, useState } from 'react'
import { X, Flag, CheckCircle } from '@phosphor-icons/react'
import type { TeamUpItem } from '@/types/teamup'

interface Props {
  item: TeamUpItem
  onClose: () => void
}

const REASONS = [
  { key: 'spam', label: 'Spam or misleading' },
  { key: 'misleading', label: 'Inaccurate information' },
  { key: 'inappropriate', label: 'Inappropriate content' },
  { key: 'duplicate', label: 'Duplicate posting' },
  { key: 'fraud', label: 'Fraud or scam' },
  { key: 'harassment', label: 'Harassment' },
  { key: 'other', label: 'Other' },
]

export function ReportModal({ item, onClose }: Props) {
  const [reason, setReason] = useState<string>('')
  const [details, setDetails] = useState('')
  const [step, setStep] = useState<'form' | 'submitting' | 'done'>('form')
  const [error, setError] = useState<string | null>(null)

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
    if (!reason) {
      setError('Please select a reason')
      return
    }
    setStep('submitting')
    setError(null)
    try {
      const res = await fetch(`/api/looking-for/${item.source_id}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_type: item.source_type,
          reason,
          details: details.trim() || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to submit report')
      }
      setStep('done')
      setTimeout(() => onClose(), 1600)
    } catch (e: any) {
      setError(e.message || 'Something went wrong')
      setStep('form')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={step !== 'submitting' ? onClose : undefined}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md rounded-xl border border-zinc-800 bg-[#0a0a0a] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h2 className="text-[15px] font-semibold text-white inline-flex items-center gap-2">
            <Flag size={14} weight="regular" />
            Report opportunity
          </h2>
          <button
            onClick={onClose}
            disabled={step === 'submitting'}
            className="w-7 h-7 rounded-md flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-900 disabled:opacity-40"
          >
            <X size={14} weight="bold" />
          </button>
        </div>

        {step === 'done' ? (
          <div className="px-6 py-10 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <CheckCircle size={20} weight="fill" />
            </div>
            <h3 className="text-[15px] font-semibold text-white mb-1.5">Report submitted</h3>
            <p className="text-[13px] text-zinc-500 max-w-sm mx-auto leading-relaxed">
              Thanks for helping keep DSRT safe. Our team will review this report.
            </p>
          </div>
        ) : (
          <>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[12.5px] font-medium text-zinc-300 mb-2">
                  Reason
                </label>
                <div className="space-y-1.5">
                  {REASONS.map(r => (
                    <label
                      key={r.key}
                      className={
                        'flex items-center gap-2.5 px-3 py-2 rounded-md border cursor-pointer transition-colors ' +
                        (reason === r.key
                          ? 'border-blue-500/30 bg-blue-500/5'
                          : 'border-zinc-800 hover:border-zinc-700')
                      }
                    >
                      <input
                        type="radio"
                        name="reason"
                        value={r.key}
                        checked={reason === r.key}
                        onChange={() => setReason(r.key)}
                        disabled={step === 'submitting'}
                        className="w-3.5 h-3.5 accent-blue-500"
                      />
                      <span className="text-[13px] text-zinc-200">{r.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[12.5px] font-medium text-zinc-300 mb-1.5">
                  Additional details
                  <span className="text-zinc-500 font-normal"> (optional)</span>
                </label>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={3}
                  placeholder="Provide any context that would help our review..."
                  disabled={step === 'submitting'}
                  className="w-full px-3 py-2.5 rounded-md bg-zinc-950 border border-zinc-800 text-[13.5px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 resize-none leading-relaxed"
                />
              </div>

              {error && (
                <div className="text-[12.5px] text-red-400 px-3 py-2 rounded-md border border-red-500/30 bg-red-500/5">
                  {error}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-zinc-800">
              <button
                onClick={onClose}
                disabled={step === 'submitting'}
                className="h-9 px-3.5 rounded-md border border-zinc-800 hover:border-zinc-700 text-[13px] text-zinc-300 disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={step === 'submitting' || !reason}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-red-600 hover:bg-red-500 text-white text-[13px] font-medium disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {step === 'submitting' ? (
                  <>
                    <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Flag size={13} weight="fill" />
                    Submit report
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
