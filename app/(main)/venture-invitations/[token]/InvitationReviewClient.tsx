'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle, PauseCircle, XCircle, CircleNotch, ArrowRight,
  MapPin, Users, Clock, Sparkle, Buildings, Envelope
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import Link from 'next/link'

interface Props {
  invitation: any
  currentUserId: string
}

type Decision = 'accept' | 'hold' | 'reject'

export function InvitationReviewClient({ invitation, currentUserId }: Props) {
  const router = useRouter()
  const [processing, setProcessing] = useState<Decision | null>(null)
  const [showHoldDialog, setShowHoldDialog] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [message, setMessage] = useState('')

  const venture = invitation.venture
  const inviter = invitation.invited_by
  const position = invitation.position
  const permissions = Array.isArray(invitation.permissions_snapshot)
    ? invitation.permissions_snapshot
    : []

  const isExpired = invitation.status === 'expired'
  const canDecide = ['sent', 'viewed', 'held'].includes(invitation.status) && !isExpired

  const daysRemaining = invitation.expires_at
    ? Math.max(0, Math.ceil((new Date(invitation.expires_at).getTime() - Date.now()) / 86400000))
    : null

  const handleAccept = async () => {
    setProcessing('accept')
    try {
      const res = await fetch(`/api/venture-invitations/${invitation.id}/accept`, {
        method: 'POST'
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to accept invitation')
      }

      toast.success(`Welcome to ${venture.name}!`)
      // Redirect to onboarding
      router.push(`/ventures/${venture.slug}/onboarding?invitation=${invitation.id}`)
    } catch (e: any) {
      toast.error(e.message || 'Could not accept invitation')
      setProcessing(null)
    }
  }

  const handleHold = async () => {
    setProcessing('hold')
    try {
      const res = await fetch(`/api/venture-invitations/${invitation.id}/hold`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message.trim() || null })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to hold invitation')

      toast.success('Invitation placed on hold')
      setShowHoldDialog(false)
      setMessage('')
      router.refresh()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setProcessing(null)
    }
  }

  const handleReject = async () => {
    setProcessing('reject')
    try {
      const res = await fetch(`/api/venture-invitations/${invitation.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message.trim() || null })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to reject invitation')

      toast.success('Invitation declined')
      setShowRejectDialog(false)
      setMessage('')
      router.refresh()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setProcessing(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#09090b] py-12 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Status banner if not actionable */}
        {!canDecide && <StatusBanner status={invitation.status} venture={venture} />}

        {/* Main Card */}
        <div className="bg-[#121215] border border-white/[0.06] rounded-2xl overflow-hidden shadow-2xl">

          {/* Cover / Header */}
          <div className="relative h-40 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black overflow-hidden">
            {venture.cover_url && (
              <img
                src={venture.cover_url}
                alt=""
                className="absolute inset-0 w-full h-full object-cover opacity-30"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#121215] via-[#121215]/50 to-transparent" />

            {/* Logo */}
            <div className="absolute -bottom-8 left-6">
              <div className="w-16 h-16 rounded-xl border-2 border-[#121215] shadow-lg bg-zinc-800 overflow-hidden flex items-center justify-center">
                {venture.logo_url ? (
                  <img src={venture.logo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Buildings size={22} className="text-zinc-500" />
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="pt-12 px-6 pb-6">

            {/* Venture info */}
            <div className="mb-6">
              <p className="text-[10.5px] font-mono uppercase tracking-widest text-zinc-500 font-bold mb-1">
                Team Invitation
              </p>
              <h1 className="text-[22px] font-bold text-white leading-tight">
                Join {venture.name}
              </h1>
              {venture.tagline && (
                <p className="text-[13px] text-zinc-400 mt-1.5 leading-relaxed">
                  {venture.tagline}
                </p>
              )}

              <div className="flex items-center gap-3 mt-3 text-[11.5px] text-zinc-500">
                {venture.industry && <span>{venture.industry}</span>}
                {venture.industry && venture.stage && <span className="w-1 h-1 rounded-full bg-zinc-700" />}
                {venture.stage && <span className="capitalize">{venture.stage}</span>}
                {venture.headquarters && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-zinc-700" />
                    <span className="flex items-center gap-1"><MapPin size={11} /> {venture.headquarters}</span>
                  </>
                )}
              </div>
            </div>

            {/* Inviter */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 mb-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center text-[13px] font-bold text-white flex-shrink-0">
                {inviter?.avatar_url ? (
                  <img src={inviter.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  inviter?.full_name?.charAt(0).toUpperCase() || '?'
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10.5px] font-mono uppercase tracking-widest text-zinc-500 font-bold">
                  Invited By
                </p>
                <p className="text-[13px] font-bold text-white truncate">{inviter?.full_name}</p>
                <p className="text-[11px] text-zinc-500 truncate">@{inviter?.username}</p>
              </div>
            </div>

            {/* Role */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 mb-4">
              <p className="text-[10.5px] font-mono uppercase tracking-widest text-zinc-500 font-bold mb-1.5">
                Proposed Role
              </p>
              <p className="text-[16px] font-bold text-white">
                {invitation.proposed_role_title || position?.title || 'Team Member'}
              </p>
              {position?.team_name && (
                <p className="text-[12px] text-zinc-400 mt-0.5">
                  {position.team_name}
                  {position?.department && <span className="text-zinc-600"> · {position.department}</span>}
                </p>
              )}
            </div>

            {/* Responsibilities */}
            {Array.isArray(position?.responsibilities) && position.responsibilities.length > 0 && (
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 mb-4">
                <p className="text-[10.5px] font-mono uppercase tracking-widest text-zinc-500 font-bold mb-2">
                  Responsibilities
                </p>
                <ul className="space-y-1.5">
                  {position.responsibilities.map((r: string, i: number) => (
                    <li key={i} className="text-[12.5px] text-zinc-300 flex items-start gap-2 leading-relaxed">
                      <span className="text-zinc-500 mt-1">·</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Access */}
            {permissions.length > 0 && (
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 mb-4">
                <p className="text-[10.5px] font-mono uppercase tracking-widest text-zinc-500 font-bold mb-2">
                  You'll Have Access To
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {permissions.map((p: string) => (
                    <span
                      key={p}
                      className="text-[10.5px] px-2 py-1 rounded-md bg-white/[0.04] border border-white/[0.06] text-zinc-300 font-medium"
                    >
                      {formatPermission(p)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Personal Message */}
            {invitation.personal_message && (
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 mb-4">
                <div className="flex items-start gap-2">
                  <Envelope size={14} className="text-zinc-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-[10.5px] font-mono uppercase tracking-widest text-zinc-500 font-bold mb-1">
                      A Note From {inviter?.full_name?.split(' ')[0]}
                    </p>
                    <p className="text-[13px] text-zinc-200 italic leading-relaxed">
                      "{invitation.personal_message}"
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Expiration */}
            {canDecide && daysRemaining !== null && (
              <div className="flex items-center gap-2 mb-6 text-[11.5px] text-zinc-500">
                <Clock size={12} />
                <span>
                  Expires in <strong className={daysRemaining <= 2 ? 'text-amber-400' : 'text-zinc-300'}>
                    {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'}
                  </strong>
                </span>
              </div>
            )}

            {/* Action Buttons */}
            {canDecide && (
              <div className="grid grid-cols-3 gap-2 mt-6">
                <button
                  onClick={() => setShowRejectDialog(true)}
                  disabled={!!processing}
                  className="inline-flex items-center justify-center gap-1.5 h-10 rounded-lg bg-white/[0.03] hover:bg-red-500/10 border border-white/[0.06] hover:border-red-500/20 text-zinc-300 hover:text-red-300 text-[12.5px] font-semibold transition-colors disabled:opacity-40"
                >
                  <XCircle size={13} weight="bold" /> Decline
                </button>
                <button
                  onClick={() => setShowHoldDialog(true)}
                  disabled={!!processing}
                  className="inline-flex items-center justify-center gap-1.5 h-10 rounded-lg bg-white/[0.03] hover:bg-amber-500/10 border border-white/[0.06] hover:border-amber-500/20 text-zinc-300 hover:text-amber-300 text-[12.5px] font-semibold transition-colors disabled:opacity-40"
                >
                  <PauseCircle size={13} weight="bold" /> Hold
                </button>
                <button
                  onClick={handleAccept}
                  disabled={!!processing}
                  className="inline-flex items-center justify-center gap-1.5 h-10 rounded-lg bg-white text-black text-[12.5px] font-bold hover:bg-zinc-200 transition-colors disabled:opacity-40 shadow-sm"
                >
                  {processing === 'accept' ? (
                    <><CircleNotch size={13} className="animate-spin" /> Joining…</>
                  ) : (
                    <><CheckCircle size={13} weight="fill" /> Accept & Join</>
                  )}
                </button>
              </div>
            )}

            {/* Trust note */}
            <p className="text-[10.5px] text-zinc-600 text-center mt-4 leading-relaxed">
              Accepting will make you an active member of {venture.name}.
              You can leave at any time from the team workspace.
            </p>
          </div>
        </div>

        {/* Footer link */}
        <div className="text-center mt-6">
          <Link
            href="/ventures"
            className="text-[12px] text-zinc-500 hover:text-white transition-colors"
          >
            ← Back to My Ventures
          </Link>
        </div>
      </div>

      {/* Hold Dialog */}
      {showHoldDialog && (
        <ResponseDialog
          title="Place on Hold"
          description={`Let ${inviter?.full_name?.split(' ')[0]} know when you'll get back to them (optional).`}
          message={message}
          onMessageChange={setMessage}
          onCancel={() => { setShowHoldDialog(false); setMessage('') }}
          onConfirm={handleHold}
          confirmLabel="Hold Invitation"
          confirmColor="amber"
          processing={processing === 'hold'}
        />
      )}

      {/* Reject Dialog */}
      {showRejectDialog && (
        <ResponseDialog
          title="Decline Invitation"
          description="Optionally share a brief reason. They'll appreciate the courtesy."
          message={message}
          onMessageChange={setMessage}
          onCancel={() => { setShowRejectDialog(false); setMessage('') }}
          onConfirm={handleReject}
          confirmLabel="Decline"
          confirmColor="red"
          processing={processing === 'reject'}
        />
      )}
    </div>
  )
}

function StatusBanner({ status, venture }: { status: string; venture: any }) {
  const configs: Record<string, { color: string; label: string; description: string }> = {
    accepted: {
      color: 'emerald',
      label: 'Already Accepted',
      description: `You're already a member of ${venture.name}.`
    },
    rejected: {
      color: 'red',
      label: 'Previously Declined',
      description: 'You declined this invitation.'
    },
    expired: {
      color: 'zinc',
      label: 'Invitation Expired',
      description: 'This invitation is no longer valid. Contact the venture owner for a new one.'
    },
    cancelled: {
      color: 'zinc',
      label: 'Invitation Cancelled',
      description: 'This invitation was revoked by the venture owner.'
    },
  }
  const c = configs[status]
  if (!c) return null

  return (
    <div className={`mb-4 rounded-xl border p-4 ${
      c.color === 'emerald' ? 'border-emerald-500/20 bg-emerald-500/[0.03]' :
      c.color === 'red' ? 'border-red-500/20 bg-red-500/[0.03]' :
      'border-white/[0.06] bg-white/[0.02]'
    }`}>
      <p className={`text-[13px] font-bold ${
        c.color === 'emerald' ? 'text-emerald-300' :
        c.color === 'red' ? 'text-red-300' : 'text-zinc-300'
      }`}>{c.label}</p>
      <p className="text-[11.5px] text-zinc-400 mt-1">{c.description}</p>
    </div>
  )
}

function ResponseDialog({
  title, description, message, onMessageChange,
  onCancel, onConfirm, confirmLabel, confirmColor, processing
}: {
  title: string
  description: string
  message: string
  onMessageChange: (m: string) => void
  onCancel: () => void
  onConfirm: () => void
  confirmLabel: string
  confirmColor: 'amber' | 'red'
  processing: boolean
}) {
  return (
    <div
      className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        className="bg-[#121215] border border-white/[0.1] rounded-2xl w-full max-w-md p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-[16px] font-bold text-white mb-2">{title}</h3>
        <p className="text-[12.5px] text-zinc-400 mb-4">{description}</p>

        <textarea
          value={message}
          onChange={e => onMessageChange(e.target.value)}
          placeholder="Optional message..."
          rows={4}
          maxLength={1000}
          className="w-full p-3 bg-[#09090b] border border-white/[0.06] rounded-lg text-[13px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/[0.15] resize-none"
          autoFocus
        />

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onCancel}
            disabled={processing}
            className="px-4 h-9 text-[12.5px] font-semibold text-zinc-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={processing}
            className={
              'inline-flex items-center gap-1.5 px-4 h-9 rounded-lg text-[12.5px] font-bold transition-colors disabled:opacity-40 ' +
              (confirmColor === 'amber'
                ? 'bg-amber-500/20 border border-amber-500/30 text-amber-200 hover:bg-amber-500/30'
                : 'bg-red-500/20 border border-red-500/30 text-red-200 hover:bg-red-500/30')
            }
          >
            {processing && <CircleNotch size={12} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function formatPermission(p: string): string {
  return p.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}