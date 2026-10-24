'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { X, PaperPlaneTilt, CheckCircle, Warning } from '@phosphor-icons/react'

interface Person {
  id: string
  username: string
  full_name: string
  avatar_url: string | null
  tagline: string | null
}

interface UserRequest {
  id: string
  title: string
  required_skills: string[]
}

interface Props {
  person: Person
  requests: UserRequest[]
  preselectedRequestId?: string
  onClose: () => void
  onSuccess: () => void
}

export function InviteModal({ person, requests, preselectedRequestId, onClose, onSuccess }: Props) {
  const [requestId, setRequestId] = useState<string>(
    preselectedRequestId || (requests[0]?.id || '')
  )
  const [message, setMessage] = useState('')
  const [step, setStep] = useState<'form' | 'submitting' | 'success'>('form')
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

  const selectedRequest = requests.find(r => r.id === requestId)

  const submit = async () => {
    if (!requestId) {
      setError('Please select a request to invite them to.')
      return
    }
    setStep('submitting')
    setError(null)

    try {
      const res = await fetch(`/api/looking-for/${requestId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_type: 'team_up',
          to_user_id: person.id,
          message: message.trim() || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to send invitation')
      }

      setStep('success')
      setTimeout(() => onSuccess(), 1400)
    } catch (e: any) {
      setError(e.message || 'Something went wrong')
      setStep('form')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={step !== 'submitting' ? onClose : undefined}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg rounded-xl border border-zinc-800 bg-[#0a0a0a] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h2 className="text-[15px] font-semibold text-white">Invite to collaborate</h2>
          <button
            onClick={onClose}
            disabled={step === 'submitting'}
            className="w-7 h-7 rounded-md flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-900 disabled:opacity-40"
          >
            <X size={14} weight="bold" />
          </button>
        </div>

        {step === 'success' ? (
          <div className="px-6 py-10 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <CheckCircle size={22} weight="fill" />
            </div>
            <h3 className="text-[15px] font-semibold text-white mb-1">
              Invitation sent to {person.full_name}
            </h3>
            <p className="text-[12.5px] text-zinc-500">
              They'll get a notification and can respond directly.
            </p>
          </div>
        ) : (
          <>
            <div className="p-5 space-y-4">
              {/* Person */}
              <div className="flex items-center gap-3 p-3 rounded-lg border border-zinc-800 bg-zinc-950/60">
                {person.avatar_url ? (
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-800 shrink-0 relative">
                    <Image src={person.avatar_url} alt="" fill className="object-cover" sizes="40px" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-[14px] font-medium text-zinc-400">
                    {person.full_name?.[0]?.toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-semibold text-white truncate">
                    {person.full_name}
                  </div>
                  {person.tagline && (
                    <div className="text-[11.5px] text-zinc-500 truncate">
                      {person.tagline}
                    </div>
                  )}
                </div>
              </div>

              {/* Request selector */}
              <div>
                <label className="block text-[12.5px] font-medium text-zinc-300 mb-1.5">
                  Invite them to
                </label>
                {requests.length === 0 ? (
                  <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/[0.03] text-[12.5px] text-zinc-400">
                    You don't have any active requests. Create one first.
                  </div>
                ) : (
                  <select
                    value={requestId}
                    onChange={(e) => setRequestId(e.target.value)}
                    disabled={step === 'submitting'}
                    className="w-full h-9 px-3 rounded-md bg-zinc-950 border border-zinc-800 text-[13px] text-zinc-200 focus:outline-none focus:border-zinc-700 cursor-pointer"
                  >
                    {requests.map(r => (
                      <option key={r.id} value={r.id}>{r.title}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Message */}
              <div>
                <label className="block text-[12.5px] font-medium text-zinc-300 mb-1.5">
                  Message
                  <span className="text-zinc-500 font-normal"> (optional)</span>
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  placeholder={`Hi ${person.full_name.split(' ')[0]}, I think your work on... could be a great fit for ${selectedRequest?.title || 'this'}...`}
                  disabled={step === 'submitting'}
                  className="w-full px-3 py-2.5 rounded-md bg-zinc-950 border border-zinc-800 text-[13.5px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 resize-none leading-relaxed"
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-md border border-red-500/30 bg-red-500/5 text-[12.5px] text-red-400">
                  <Warning size={14} weight="fill" className="shrink-0 mt-0.5" />
                  <span>{error}</span>
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
                disabled={step === 'submitting' || !requestId}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-[13px] font-medium disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {step === 'submitting' ? (
                  <>
                    <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <PaperPlaneTilt size={13} weight="fill" />
                    Send invitation
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
