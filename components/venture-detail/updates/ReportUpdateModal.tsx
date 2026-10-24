'use client'

import { useState } from 'react'
import { X, CircleNotch, Warning } from '@phosphor-icons/react'
import { toast } from 'sonner'

const REASONS = [
  { value: 'spam', label: 'Spam or misleading' },
  { value: 'harassment', label: 'Harassment or abuse' },
  { value: 'misinformation', label: 'False information' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'copyright', label: 'Copyright violation' },
  { value: 'other', label: 'Other' },
]

interface Props {
  open: boolean
  onClose: () => void
  slug: string
  update: any
}

export function ReportUpdateModal({ open, onClose, slug, update }: Props) {
  const [reason, setReason] = useState('')
  const [details, setDetails] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!open || !update) return null

  const submit = async () => {
    if (!reason) {
      toast.error('Please select a reason')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/ventures/${slug}/updates/${update.id}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, details }),
      })
      if (!res.ok) throw new Error()
      toast.success('Report submitted. Our team will review it.')
      onClose()
    } catch {
      toast.error('Failed to submit report')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#0d0d10] border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Warning size={16} weight="fill" className="text-amber-400" />
            <h2 className="text-[15px] font-bold text-white">Report update</h2>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white"><X size={16} /></button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-[12.5px] text-zinc-400 leading-relaxed">
            Help us keep DSRT Connect safe. Reports are confidential and reviewed by our moderation team.
          </p>

          <div>
            <label className="block text-[12px] font-semibold text-white mb-2">Reason</label>
            <div className="space-y-1">
              {REASONS.map(r => (
                <label key={r.value} className="flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-zinc-800/50 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="reason"
                    value={r.value}
                    checked={reason === r.value}
                    onChange={e => setReason(e.target.value)}
                    className="accent-white"
                  />
                  <span className="text-[13px] text-zinc-200">{r.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-white mb-1.5">Additional details (optional)</label>
            <textarea
              value={details}
              onChange={e => setDetails(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Provide any context that might help us review this report..."
              className="w-full p-3 bg-[#09090b] border border-zinc-800 rounded-lg text-[13px] text-white focus:outline-none focus:border-zinc-600 resize-none"
            />
          </div>
        </div>

        <div className="px-5 py-4 border-t border-zinc-800 bg-zinc-900/30 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 h-9 text-[12.5px] font-semibold text-zinc-400 hover:text-white">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={submitting || !reason}
            className="inline-flex items-center gap-1.5 px-5 h-9 bg-red-500 text-white rounded-lg text-[12.5px] font-bold hover:bg-red-400 disabled:opacity-50"
          >
            {submitting ? <CircleNotch size={13} className="animate-spin" /> : 'Submit report'}
          </button>
        </div>
      </div>
    </div>
  )
}