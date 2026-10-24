'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Buildings, CheckCircle, PauseCircle, XCircle, Clock,
  ArrowRight, CircleNotch, Sparkle, Envelope, PaperPlaneTilt,
  Prohibit, ArrowClockwise
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

interface Props {
  message: any
}

export function TeamInvitationMailCard({ message }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const meta = message.metadata || {}
  const type = message.message_type
  const invitationId = meta.invitation_id
  const secureToken = meta.secure_token

  // ── ALL HOOKS MUST BE CALLED AT TOP LEVEL BEFORE ANY EARLY RETURNS ──
  const [invitation, setInvitation] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)

  const fetchInvitation = useCallback(async () => {
    if (!invitationId) {
      setLoading(false)
      return
    }
    try {
      const res = await fetch(`/api/venture-invitations/${invitationId}`)
      if (res.ok) {
        const data = await res.json()
        setInvitation(data)
      }
    } catch {}
    setLoading(false)
  }, [invitationId])

  useEffect(() => {
    fetchInvitation()
  }, [fetchInvitation])

  // Real-time subscription — reflect state changes immediately
  useEffect(() => {
    if (!invitationId) return
    const channel = supabase
      .channel(`invitation-mail-card:${invitationId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'venture_team_invitations',
          filter: `id=eq.${invitationId}`,
        },
        () => fetchInvitation()
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [invitationId, supabase, fetchInvitation])

  // ── CONDITIONAL RENDERINGS (SAFE AFTER ALL HOOKS) ──

  // System event messages render as timeline entries
  if (type === 'system' && meta.event_type?.startsWith('invitation.')) {
    return <SystemEventRow eventType={meta.event_type} createdAt={message.created_at} metadata={meta} />
  }

  // Only render for team_invitation type
  if (type !== 'team_invitation') return null

  if (loading) {
    return (
      <div className="mt-4 mb-2 rounded-2xl border border-white/[0.06] bg-[#121215] p-5 max-w-md">
        <div className="flex items-center gap-2 text-[12.5px] text-zinc-500">
          <CircleNotch size={13} className="animate-spin" />
          Loading invitation…
        </div>
      </div>
    )
  }

  if (!invitation?.invitation) {
    return (
      <div className="mt-4 mb-2 rounded-2xl border border-white/[0.06] bg-[#121215] p-5 max-w-md">
        <p className="text-[12.5px] text-zinc-500 italic">
          Invitation is no longer available.
        </p>
      </div>
    )
  }

  const inv = invitation.invitation
  const canAccept = invitation.can_accept
  const canHold = invitation.can_hold
  const canReject = invitation.can_reject

  const daysRemaining = inv.expires_at
    ? Math.max(0, Math.ceil((new Date(inv.expires_at).getTime() - Date.now()) / 86400000))
    : null

  const handleAccept = async () => {
    setProcessing('accept')
    try {
      const res = await fetch(`/api/venture-invitations/${inv.id}/accept`, {
        method: 'POST'
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to accept')
      }
      toast.success(`Welcome to ${meta.venture_name}!`)
      router.push(`/ventures/${data.venture_slug || meta.venture_slug}/onboarding?invitation=${inv.id}`)
    } catch (e: any) {
      toast.error(e.message || 'Could not accept invitation')
      setProcessing(null)
    }
  }

  const handleHold = async () => {
    setProcessing('hold')
    try {
      const res = await fetch(`/api/venture-invitations/${inv.id}/hold`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })
      if (!res.ok) throw new Error()
      toast.success('Placed on hold')
      fetchInvitation()
    } catch {
      toast.error('Failed to hold')
    } finally {
      setProcessing(null)
    }
  }

  const handleReject = async () => {
    if (!confirm('Decline this invitation?')) return
    setProcessing('reject')
    try {
      const res = await fetch(`/api/venture-invitations/${inv.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })
      if (!res.ok) throw new Error()
      toast.success('Invitation declined')
      fetchInvitation()
    } catch {
      toast.error('Failed to decline')
    } finally {
      setProcessing(null)
    }
  }

  // Terminal states — show status card only
  if (inv.status === 'accepted') {
    return (
      <div className="mt-4 mb-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.03] p-5 max-w-md">
        <div className="flex items-center gap-3 mb-3">
          <CheckCircle size={20} weight="fill" className="text-emerald-400" />
          <div>
            <p className="text-[14px] font-bold text-emerald-300">Invitation Accepted</p>
            <p className="text-[11.5px] text-emerald-200/80 mt-0.5">
              You joined {meta.venture_name} as {inv.proposed_role_title}
            </p>
          </div>
        </div>
        <Link
          href={`/ventures/${meta.venture_slug}`}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-[12px] font-semibold text-emerald-300 transition-colors"
        >
          Open Venture <ArrowRight size={11} weight="bold" />
        </Link>
      </div>
    )
  }

  if (inv.status === 'rejected') {
    return (
      <StatusCard
        icon={XCircle}
        color="red"
        label="Invitation Declined"
        description={`You declined the invitation to join ${meta.venture_name}.`}
      />
    )
  }

  if (inv.status === 'expired') {
    return (
      <StatusCard
        icon={Clock}
        color="zinc"
        label="Invitation Expired"
        description="This invitation is no longer valid. Contact the venture owner for a new one."
      />
    )
  }

  if (inv.status === 'cancelled') {
    return (
      <StatusCard
        icon={Prohibit}
        color="zinc"
        label="Invitation Revoked"
        description="This invitation was revoked by the venture owner."
      />
    )
  }

  // Active card (sent / viewed / held)
  return (
    <div className="mt-4 mb-2 rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#18181b] via-[#121215] to-[#0f0f11] overflow-hidden max-w-md shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
      {/* Top strip */}
      <div className="px-5 py-3 border-b border-white/[0.06] bg-black/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Sparkle size={11} weight="fill" className="text-emerald-400" />
          </div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 font-bold">
            Team Invitation
          </span>
        </div>
        <StatusPill status={inv.status} />
      </div>

      <div className="p-5 space-y-4">
        {/* Venture header */}
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-white/[0.06] flex items-center justify-center shrink-0 overflow-hidden">
            {meta.venture_logo ? (
              <img src={meta.venture_logo} alt="" className="w-full h-full object-cover" />
            ) : (
              <Buildings size={20} className="text-zinc-500" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-bold text-white truncate">
              {meta.venture_name}
            </p>
            <p className="text-[12.5px] text-zinc-400 truncate mt-0.5">
              Proposed role: <strong className="text-white">{inv.proposed_role_title}</strong>
            </p>
          </div>
        </div>

        {/* Team + Expiration */}
        <div className="grid grid-cols-2 gap-3 py-3 border-y border-white/[0.06]">
          <div>
            <p className="text-[9.5px] font-mono uppercase tracking-widest text-zinc-500 font-bold mb-0.5">
              Team
            </p>
            <p className="text-[12px] font-semibold text-zinc-200 truncate">
              {meta.team_name || '—'}
            </p>
          </div>
          <div>
            <p className="text-[9.5px] font-mono uppercase tracking-widest text-zinc-500 font-bold mb-0.5">
              {daysRemaining !== null ? 'Expires In' : 'Status'}
            </p>
            <p className={
              'text-[12px] font-semibold flex items-center gap-1 ' +
              (daysRemaining !== null && daysRemaining <= 2 ? 'text-amber-400' : 'text-zinc-200')
            }>
              <Clock size={11} />
              {daysRemaining !== null ? `${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'}` : 'Active'}
            </p>
          </div>
        </div>

        {/* Personal message */}
        {inv.personal_message && (
          <div className="rounded-lg border border-white/[0.04] bg-white/[0.02] p-3">
            <div className="flex items-start gap-2">
              <Envelope size={12} className="text-zinc-500 mt-0.5 flex-shrink-0" />
              <p className="text-[12px] text-zinc-300 italic leading-relaxed">
                "{inv.personal_message}"
              </p>
            </div>
          </div>
        )}

        {/* Action buttons */}
        {(canAccept || canHold || canReject) && (
          <div className="grid grid-cols-3 gap-2 pt-1">
            {canReject && (
              <button
                onClick={handleReject}
                disabled={!!processing}
                className="inline-flex items-center justify-center gap-1 h-9 rounded-lg bg-white/[0.03] hover:bg-red-500/10 border border-white/[0.06] hover:border-red-500/20 text-zinc-300 hover:text-red-300 text-[11.5px] font-semibold transition-colors disabled:opacity-40"
              >
                Decline
              </button>
            )}
            {canHold && (
              <button
                onClick={handleHold}
                disabled={!!processing}
                className="inline-flex items-center justify-center gap-1 h-9 rounded-lg bg-white/[0.03] hover:bg-amber-500/10 border border-white/[0.06] hover:border-amber-500/20 text-zinc-300 hover:text-amber-300 text-[11.5px] font-semibold transition-colors disabled:opacity-40"
              >
                Hold
              </button>
            )}
            {canAccept && (
              <button
                onClick={handleAccept}
                disabled={!!processing}
                className="inline-flex items-center justify-center gap-1 h-9 rounded-lg bg-white text-black text-[11.5px] font-bold hover:bg-zinc-200 disabled:opacity-40 transition-colors shadow-sm"
              >
                {processing === 'accept' ? (
                  <CircleNotch size={12} className="animate-spin" />
                ) : (
                  <>Accept <ArrowRight size={11} weight="bold" /></>
                )}
              </button>
            )}
          </div>
        )}

        {/* Full review link */}
        <Link
          href={`/venture-invitations/${secureToken || inv.id}`}
          className="block text-center text-[10.5px] text-zinc-500 hover:text-white transition-colors pt-1"
        >
          View full invitation details →
        </Link>
      </div>
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const config: Record<string, { label: string; color: string }> = {
    sent: { label: 'Awaiting Response', color: 'text-blue-300 bg-blue-500/10 border-blue-500/20' },
    viewed: { label: 'Viewed', color: 'text-purple-300 bg-purple-500/10 border-purple-500/20' },
    held: { label: 'On Hold', color: 'text-amber-300 bg-amber-500/10 border-amber-500/20' },
  }
  const c = config[status]
  if (!c) return null
  return (
    <span className={`text-[9.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${c.color}`}>
      {c.label}
    </span>
  )
}

function StatusCard({ icon: Icon, color, label, description }: {
  icon: any
  color: 'emerald' | 'red' | 'zinc'
  label: string
  description: string
}) {
  const colorClasses = {
    emerald: 'border-emerald-500/20 bg-emerald-500/[0.03]',
    red: 'border-red-500/20 bg-red-500/[0.03]',
    zinc: 'border-white/[0.06] bg-white/[0.02]',
  }
  const iconClasses = {
    emerald: 'text-emerald-400',
    red: 'text-red-400',
    zinc: 'text-zinc-500',
  }
  const textClasses = {
    emerald: 'text-emerald-300',
    red: 'text-red-300',
    zinc: 'text-zinc-300',
  }

  return (
    <div className={`mt-4 mb-2 rounded-2xl border p-5 max-w-md ${colorClasses[color]}`}>
      <div className="flex items-center gap-3">
        <Icon size={20} weight="fill" className={iconClasses[color]} />
        <div className="flex-1 min-w-0">
          <p className={`text-[14px] font-bold ${textClasses[color]}`}>{label}</p>
          <p className="text-[11.5px] text-zinc-400 mt-0.5">{description}</p>
        </div>
      </div>
    </div>
  )
}

function SystemEventRow({
  eventType, createdAt
}: {
  eventType: string
  createdAt: string
  metadata: any
}) {
  const config: Record<string, { icon: any; color: string; label: string }> = {
    'invitation.viewed': { icon: CheckCircle, color: 'text-purple-400', label: 'Invitation viewed' },
    'invitation.held': { icon: PauseCircle, color: 'text-amber-400', label: 'Placed on hold' },
    'invitation.accepted': { icon: CheckCircle, color: 'text-emerald-400', label: 'Accepted · Member joined' },
    'invitation.rejected': { icon: XCircle, color: 'text-red-400', label: 'Declined' },
    'invitation.revoked': { icon: Prohibit, color: 'text-zinc-400', label: 'Revoked by sender' },
    'invitation.expired': { icon: Clock, color: 'text-zinc-500', label: 'Expired' },
    'invitation.resent': { icon: ArrowClockwise, color: 'text-blue-400', label: 'Resent with extended expiration' },
  }

  const c = config[eventType]
  if (!c) return null
  const Icon = c.icon

  return (
    <div className="my-2 flex items-center gap-2 text-[11.5px] text-zinc-500">
      <div className="w-6 h-6 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center flex-shrink-0">
        <Icon size={11} className={c.color} weight="bold" />
      </div>
      <span className="flex-1">
        <span className="text-zinc-400 font-semibold">{c.label}</span>
        <span className="text-zinc-600 ml-2">
          {new Date(createdAt).toLocaleString('en', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
          })}
        </span>
      </span>
    </div>
  )
}