'use client'

import { useState, useEffect } from 'react'
import { X, CheckCircle } from '@phosphor-icons/react'

interface Props { post: any; onClose: () => void }

const REASONS = [
  { value: 'spam', label: 'Spam or misleading' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'hate_speech', label: 'Hate speech' },
  { value: 'misinformation', label: 'Misinformation' },
  { value: 'nudity', label: 'Nudity or sexual content' },
  { value: 'violence', label: 'Violence' },
  { value: 'copyright', label: 'Copyright' },
  { value: 'other', label: 'Other' },
]

export function ReportModal({ post, onClose }: Props) {
  const [reason, setReason] = useState('')
  const [details, setDetails] = useState('')
  const [step, setStep] = useState<'form' | 'submitting' | 'success'>('form')

  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && step !== 'submitting' && onClose()
    window.addEventListener('keydown', h)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', h); document.body.style.overflow = '' }
  }, [onClose, step])

  const submit = async () => {
    if (!reason) return
    setStep('submitting')
    try {
      await fetch(`/api/posts/${post.id}/report`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, details: details.trim() || null }),
      })
      setStep('success')
      setTimeout(onClose, 1400)
    } catch { setStep('form') }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={step !== 'submitting' ? onClose : undefined}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-[#0a0a0b] overflow-hidden shadow-[0_20px_80px_rgba(0,0,0,0.7)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h2 className="text-[15px] font-bold text-white tracking-tight">Report post</h2>
          <button onClick={onClose} disabled={step === 'submitting'} className="w-8 h-8 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-900 flex items-center justify-center disabled:opacity-40"><X size={14} weight="bold" /></button>
        </div>
        {step === 'success' ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-center"><CheckCircle size={20} weight="fill" className="text-emerald-400" /></div>
            <h3 className="text-[15px] font-bold text-white mb-1">Report submitted</h3>
            <p className="text-[12.5px] text-zinc-500">Our team will review this.</p>
          </div>
        ) : (
          <>
            <div className="p-5 space-y-4">
              <p className="text-[12.5px] text-zinc-400">Why are you reporting this?</p>
              <div className="space-y-1">{REASONS.map(r => (
                <label key={r.value} className="flex items-center gap-2.5 py-1.5 cursor-pointer">
                  <input type="radio" name="reason" value={r.value} checked={reason === r.value} onChange={(e) => setReason(e.target.value)} disabled={step === 'submitting'} className="w-3.5 h-3.5 accent-white" />
                  <span className={'text-[13px] ' + (reason === r.value ? 'text-white font-medium' : 'text-zinc-400')}>{r.label}</span>
                </label>
              ))}</div>
              <textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={3} maxLength={1000} disabled={step === 'submitting'} placeholder="Additional context (optional)" className="w-full px-3 py-2 rounded-md bg-zinc-950 border border-zinc-800 text-[12.5px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 resize-none" />
            </div>
            <div className="px-5 py-3 border-t border-zinc-800 flex justify-end gap-2">
              <button onClick={onClose} disabled={step === 'submitting'} className="h-9 px-4 rounded-md border border-zinc-800 hover:border-zinc-700 text-[12.5px] font-medium text-zinc-300 hover:text-white disabled:opacity-40">Cancel</button>
              <button onClick={submit} disabled={!reason || step === 'submitting'} className="h-9 px-4 rounded-md bg-red-500 hover:bg-red-400 text-white text-[12.5px] font-bold disabled:opacity-40 disabled:cursor-not-allowed">{step === 'submitting' ? 'Submitting...' : 'Submit report'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}