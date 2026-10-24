'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, PaperPlaneTilt, CheckCircle, XCircle, Warning,
  ArrowUpRight, Clock,
} from '@phosphor-icons/react'
import { EmptyState } from '../EmptyState'
import { FilterChips } from '../FilterChips'

interface Invitation {
  id: string
  source_type: string
  source_id: string
  from_user_id: string
  to_user_id: string
  message: string | null
  status: string
  response_note: string | null
  expires_at: string | null
  responded_at: string | null
  created_at: string
  other_user?: {
    id: string
    username: string
    full_name: string
    avatar_url: string | null
    tagline: string | null
  }
  opportunity?: {
    id: string
    source_type: string
    source_id: string
    title: string
    tagline: string | null
    request_type: string
  } | null
}

const DIRECTION_CHIPS = [
  { key: 'received', label: 'Received' },
  { key: 'sent', label: 'Sent' },
]

const STATUS_CHIPS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'declined', label: 'Declined' },
]

export function InvitationsInbox() {
  const router = useRouter()
  const [direction, setDirection] = useState<'received' | 'sent'>('received')
  const [status, setStatus] = useState('all')
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ direction })
      if (status !== 'all') params.set('status', status)
      const res = await fetch(`/api/looking-for/invitations?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to load invitations')
      const data = await res.json()
      setInvitations(data.invitations || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [direction, status])

  useEffect(() => {
    load()
  }, [load])

  const respond = async (invite: Invitation, response: 'accepted' | 'declined') => {
    setProcessingId(invite.id)
    try {
      const res = await fetch(`/api/looking-for/${invite.id}/invite`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: response }),
      })
      if (!res.ok) throw new Error()
      await load()
    } catch { /* ignore */ } finally {
      setProcessingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100">
      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Back */}
        <button
          onClick={() => router.push('/looking-for')}
          className="inline-flex items-center gap-1.5 text-[12.5px] text-zinc-500 hover:text-zinc-300 mb-5 transition-colors"
        >
          <ArrowLeft size={13} />
          Team Up
        </button>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-[24px] font-semibold text-white tracking-tight">Invitations</h1>
          <p className="text-[13px] text-zinc-500 mt-1">
            Direct invites to collaborate on team-up opportunities.
          </p>
        </div>

        {/* Chips */}
        <div className="flex items-center gap-3 flex-wrap mb-4">
          <FilterChips
            chips={DIRECTION_CHIPS}
            active={direction}
            onChange={(k) => setDirection(k as 'received' | 'sent')}
          />
          <div className="w-px h-5 bg-zinc-800" />
          <FilterChips chips={STATUS_CHIPS} active={status} onChange={setStatus} />
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map(i => (
              <div key={i} className="h-28 rounded-xl border border-zinc-800/80 bg-zinc-950/40 animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <EmptyState
            icon={<Warning size={20} weight="regular" />}
            title="Couldn't load invitations"
            description={error}
          />
        ) : invitations.length === 0 ? (
          <EmptyState
            icon={<PaperPlaneTilt size={20} weight="regular" />}
            title={direction === 'received' ? 'No invitations received' : 'No invitations sent'}
            description={direction === 'received'
              ? "When someone invites you to collaborate on a team-up opportunity, it'll appear here."
              : "Invite people from the Suggested tab to collaborate on your requests."}
          />
        ) : (
          <div className="space-y-2">
            {invitations.map(inv => (
              <InvitationCard
                key={inv.id}
                invitation={inv}
                direction={direction}
                processing={processingId === inv.id}
                onRespond={(r) => respond(inv, r)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function InvitationCard({
  invitation, direction, processing, onRespond,
}: {
  invitation: Invitation
  direction: 'received' | 'sent'
  processing: boolean
  onRespond: (r: 'accepted' | 'declined') => void
}) {
  const other = invitation.other_user
  const opp = invitation.opportunity
  const isPending = invitation.status === 'pending'
  const isExpired = invitation.expires_at && new Date(invitation.expires_at) < new Date()

  const statusBadge = () => {
    if (invitation.status === 'accepted') return { label: 'Accepted', cls: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' }
    if (invitation.status === 'declined') return { label: 'Declined', cls: 'border-zinc-700 bg-zinc-900 text-zinc-500' }
    if (invitation.status === 'withdrawn') return { label: 'Withdrawn', cls: 'border-zinc-700 bg-zinc-900 text-zinc-500' }
    if (isExpired) return { label: 'Expired', cls: 'border-orange-500/30 bg-orange-500/10 text-orange-400' }
    return { label: 'Pending', cls: 'border-blue-500/30 bg-blue-500/10 text-blue-400' }
  }
  const badge = statusBadge()

  return (
    <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-4">
      <div className="flex items-start gap-3">
        {other?.avatar_url ? (
          <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-800 shrink-0 relative">
            <Image src={other.avatar_url} alt="" fill className="object-cover" sizes="40px" />
          </div>
        ) : (
          <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-[13px] font-medium text-zinc-400 shrink-0">
            {other?.full_name?.[0]?.toUpperCase() || '?'}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {other && (
              <Link
                href={`/profile/${other.username}`}
                className="text-[13.5px] font-semibold text-white hover:text-blue-400 transition-colors"
              >
                {other.full_name}
              </Link>
            )}
            <span className="text-[12px] text-zinc-500">
              {direction === 'received' ? 'invited you' : 'invited to'}
            </span>
            <span className={
              'inline-flex items-center h-5 px-1.5 rounded text-[10px] font-medium uppercase tracking-wider border ' +
              badge.cls
            }>
              {badge.label}
            </span>
          </div>

          {opp && (
            <Link
              href={`/looking-for/${opp.source_id}?source=${opp.source_type}`}
              className="inline-flex items-center gap-1 text-[12.5px] text-blue-400 hover:text-blue-300 mb-2"
            >
              {opp.title}
              <ArrowUpRight size={10} weight="bold" />
            </Link>
          )}

          {invitation.message && (
            <p className="text-[12.5px] text-zinc-400 leading-relaxed p-3 rounded-md bg-zinc-950 border border-zinc-800/60 mt-2 whitespace-pre-wrap">
              {invitation.message}
            </p>
          )}

          <div className="flex items-center gap-3 text-[11px] text-zinc-500 mt-2">
            <span>Sent {timeAgo(invitation.created_at)}</span>
            {isPending && !isExpired && invitation.expires_at && (
              <>
                <span className="w-1 h-1 rounded-full bg-zinc-700" />
                <span className="inline-flex items-center gap-1">
                  <Clock size={10} />
                  Expires {timeAgo(invitation.expires_at, true)}
                </span>
              </>
            )}
            {invitation.responded_at && (
              <>
                <span className="w-1 h-1 rounded-full bg-zinc-700" />
                <span>Responded {timeAgo(invitation.responded_at)}</span>
              </>
            )}
          </div>

          {direction === 'received' && isPending && !isExpired && (
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={() => onRespond('accepted')}
                disabled={processing}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-[12px] font-medium disabled:opacity-60"
              >
                <CheckCircle size={11} weight="fill" />
                Accept
              </button>
              <button
                onClick={() => onRespond('declined')}
                disabled={processing}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-zinc-800 hover:border-red-500/30 text-zinc-400 hover:text-red-400 text-[12px] disabled:opacity-60"
              >
                <XCircle size={11} weight="regular" />
                Decline
              </button>
              {opp && (
                <Link
                  href={`/looking-for/${opp.source_id}?source=${opp.source_type}`}
                  className="inline-flex items-center gap-1 h-8 px-3 rounded-md border border-zinc-800 hover:border-zinc-700 text-[12px] text-zinc-300"
                >
                  View opportunity
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function timeAgo(iso: string, future?: boolean): string {
  const now = Date.now()
  const then = new Date(iso).getTime()
  const secs = Math.abs(Math.floor((future ? then - now : now - then) / 1000))
  if (secs < 60) return future ? 'in <1m' : 'just now'
  const mins = Math.floor(secs / 60)
  if (mins < 60) return future ? `in ${mins}m` : `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return future ? `in ${hrs}h` : `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return future ? `in ${days}d` : `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 4) return future ? `in ${weeks}w` : `${weeks}w ago`
  const months = Math.floor(days / 30)
  return future ? `in ${months}mo` : `${months}mo ago`
}
