'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
  CircleNotch,
  FolderSimple,
  Rocket,
  EnvelopeSimple,
  CalendarBlank,
} from '@phosphor-icons/react'

export function ApplicantInvitationCard({ applicationId, onStatusChange }: { applicationId: string, onStatusChange?: () => void }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<'accept' | 'decline' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/team-invitations/for-application/${applicationId}`)
      const d = await res.json()
      if (res.ok && d.invitation) {
        setData(d)
      } else {
        setData(null)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [applicationId])

  useEffect(() => { load() }, [load])

  const handleAction = async (action: 'accept' | 'decline') => {
    if (action === 'decline' && !confirm('Are you sure you want to decline this invitation?')) return
    
    setBusy(action)
    setError(null)
    try {
      const res = await fetch(`/api/team-invitations/${data.invitation.id}/${action}`, {
        method: 'POST',
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || `Failed to ${action}`)
      
      await load()
      if (onStatusChange) onStatusChange()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBusy(null)
    }
  }

  if (loading) {
    return <div className="h-32 rounded-2xl border border-zinc-800 bg-zinc-950/40 animate-pulse mb-6" />
  }

  if (!data || !data.invitation) return null

  const { invitation, destination, inviter } = data
  const status = invitation.status
  const destType = invitation.destination_type

  // Accepted State
  if (status === 'accepted') {
    return (
      <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-gradient-to-b from-emerald-500/10 to-[#0f0f11] p-6 shadow-[0_4px_24px_rgba(16,185,129,0.1)]">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <CheckCircle size={24} weight="fill" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-[16px] font-bold text-emerald-400 mb-1">You joined the team!</h3>
            <p className="text-[13px] text-zinc-300 mb-4">
              You accepted the invitation to join <strong>{invitation.destination_name}</strong> as a <strong>{invitation.role}</strong>.
            </p>
            <Link
              href={destType === 'project' ? `/projects/${destination?.slug || destination?.id}` : `/ventures/${destination?.slug || destination?.id}`}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-emerald-500 text-black font-bold text-[13px] hover:bg-emerald-400 transition-colors shadow-sm"
            >
              Open Workspace <ArrowRight size={14} weight="bold" />
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Declined, Cancelled, Expired States
  if (['declined', 'cancelled', 'expired'].includes(status)) {
    return (
      <div className="mb-6 rounded-2xl border border-zinc-800/80 bg-zinc-950/40 p-5 flex items-center gap-3">
        {status === 'declined' ? <XCircle size={20} className="text-red-400" weight="fill" /> : <Clock size={20} className="text-zinc-500" />}
        <div>
          <div className="text-[13px] font-bold text-white capitalize">Invitation {status}</div>
          <div className="text-[12px] text-zinc-500">The team invitation for {invitation.destination_name} is no longer active.</div>
        </div>
      </div>
    )
  }

  // PENDING State (Actionable)
  return (
    <div className="mb-6 rounded-2xl border border-blue-500/30 bg-gradient-to-b from-blue-500/10 via-[#121215] to-[#0f0f11] overflow-hidden shadow-[0_8px_32px_rgba(59,130,246,0.1)]">
      <div className="px-6 py-4 border-b border-blue-500/20 bg-blue-500/5 flex items-center gap-2">
        <EnvelopeSimple size={18} className="text-blue-400" />
        <span className="text-[12px] font-bold uppercase tracking-wider text-blue-300">
          Official Team Invitation
        </span>
      </div>

      <div className="p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-14 h-14 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 shadow-inner">
            {destType === 'venture' ? (
              destination?.logo_url ? <img src={destination.logo_url} className="w-full h-full rounded-xl object-cover" alt="" /> : <Rocket size={24} className="text-zinc-500" />
            ) : (
              destination?.icon ? <span className="text-2xl">{destination.icon}</span> : <FolderSimple size={24} className="text-zinc-500" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-[20px] font-bold text-white leading-tight mb-1">{invitation.destination_name}</h2>
            <div className="flex flex-wrap items-center gap-3 text-[13px] text-zinc-400">
              <span className="text-blue-300 font-semibold">{invitation.role}</span>
              <span className="text-zinc-700">·</span>
              <span className="capitalize">{destType}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-5 border-y border-zinc-800/60 mb-6">
          <div>
            <div className="text-[10.5px] font-bold uppercase tracking-wider text-zinc-500 mb-2">Invited By</div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-zinc-800 overflow-hidden flex items-center justify-center text-[9px] font-bold">
                {inviter?.avatar_url ? <img src={inviter.avatar_url} className="w-full h-full object-cover" alt="" /> : inviter?.full_name?.charAt(0)}
              </div>
              <span className="text-[13px] font-medium text-zinc-200">{inviter?.full_name || 'Employer'}</span>
            </div>
          </div>
          
          <div>
            <div className="text-[10.5px] font-bold uppercase tracking-wider text-zinc-500 mb-2">Proposed Start Date</div>
            <div className="flex items-center gap-1.5 text-[13px] font-medium text-zinc-200">
              <CalendarBlank size={14} className="text-zinc-500" />
              {invitation.start_date ? new Date(invitation.start_date).toLocaleDateString() : 'To be determined'}
            </div>
          </div>
        </div>

        {invitation.message && (
          <div className="mb-6 rounded-xl bg-zinc-950/50 border border-zinc-800/80 p-4">
            <div className="text-[10.5px] font-bold uppercase tracking-wider text-zinc-500 mb-2">Message from {inviter?.full_name?.split(' ')[0] || 'employer'}</div>
            <p className="text-[13.5px] text-zinc-300 leading-relaxed whitespace-pre-wrap italic">
              "{invitation.message}"
            </p>
          </div>
        )}

        {error && (
          <div className="mb-5 p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-[12.5px] text-red-400">
            {error}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleAction('accept')}
            disabled={!!busy}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 h-11 px-8 rounded-xl bg-white text-black text-[13.5px] font-bold hover:bg-zinc-200 transition-all shadow-[0_2px_16px_rgba(255,255,255,0.15)] disabled:opacity-50"
          >
            {busy === 'accept' ? <CircleNotch size={16} className="animate-spin" /> : <CheckCircle size={16} weight="bold" />}
            Accept & Join
          </button>
          <button
            onClick={() => handleAction('decline')}
            disabled={!!busy}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl border border-zinc-700 bg-zinc-950 text-[13px] font-semibold text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors disabled:opacity-50"
          >
            {busy === 'decline' ? <CircleNotch size={16} className="animate-spin" /> : <XCircle size={16} />}
            Decline
          </button>
        </div>
      </div>
    </div>
  )
}