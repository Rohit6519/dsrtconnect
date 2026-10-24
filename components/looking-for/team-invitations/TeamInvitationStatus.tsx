'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  PaperPlaneTilt, CheckCircle, XCircle, Clock,
  ArrowUpRight, CircleNotch, Rocket, FolderSimple,
} from '@phosphor-icons/react'
import { TeamInvitationModal } from './TeamInvitationModal'

interface Props {
  applicationId: string
  opportunityId: string
  applicantName: string
  pipelineStage: string
  onRefresh?: () => void
}

const STATUS_DISPLAY: Record<string, { label: string; Icon: any; className: string }> = {
  pending: { label: 'Invitation Pending', Icon: Clock, className: 'border-amber-500/25 bg-amber-500/10 text-amber-400' },
  accepted: { label: 'Joined Team', Icon: CheckCircle, className: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400' },
  declined: { label: 'Invitation Declined', Icon: XCircle, className: 'border-red-500/25 bg-red-500/10 text-red-400' },
  cancelled: { label: 'Invitation Cancelled', Icon: XCircle, className: 'border-zinc-700 bg-zinc-900 text-zinc-500' },
  expired: { label: 'Invitation Expired', Icon: Clock, className: 'border-zinc-700 bg-zinc-900 text-zinc-500' },
}

export function TeamInvitationStatus({ applicationId, opportunityId, applicantName, pipelineStage, onRefresh }: Props) {
  const [invitation, setInvitation] = useState<any>(null)
  const [destination, setDestination] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/team-invitations/for-application/${applicationId}`)
      const d = await res.json()
      setInvitation(d.invitation || null)
      setDestination(d.destination || null)
    } catch {
      setInvitation(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [applicationId])

  const isSelected = pipelineStage === 'accepted'

  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
        <div className="flex items-center gap-2 text-[12px] text-zinc-500">
          <CircleNotch size={12} className="animate-spin" />
          <span>Loading team status...</span>
        </div>
      </div>
    )
  }

  // No invitation exists yet
  if (!invitation) {
    if (!isSelected) return null // Don't show anything if not selected

    return (
      <>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
          <div className="text-[10.5px] font-bold uppercase tracking-wider text-zinc-500 mb-3">
            Team
          </div>
          <p className="text-[12px] text-zinc-400 mb-3">
            This applicant has been selected but hasn't received a team invitation yet.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="w-full h-10 rounded-xl bg-white text-black hover:bg-zinc-200 text-[13px] font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
          >
            <PaperPlaneTilt size={14} weight="bold" />
            Invite to Team
          </button>
        </div>

        <TeamInvitationModal
          isOpen={showModal}
          applicationId={applicationId}
          opportunityId={opportunityId}
          applicantName={applicantName}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false)
            load()
            onRefresh?.()
          }}
        />
      </>
    )
  }

  // Invitation exists — show status
  const display = STATUS_DISPLAY[invitation.status] || STATUS_DISPLAY.pending
  const destType = invitation.destination_type
  const destSlug = destination?.slug || invitation.destination_id

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
      <div className="text-[10.5px] font-bold uppercase tracking-wider text-zinc-500 mb-3">
        Team Invitation
      </div>

      {/* Status Badge */}
      <div className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-[11px] font-bold uppercase tracking-wider border ${display.className} mb-3`}>
        <display.Icon size={12} weight="fill" />
        {display.label}
      </div>

      {/* Destination Info */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
          {destType === 'project' ? (
            destination?.icon ? <span>{destination.icon}</span> : <FolderSimple size={14} className="text-zinc-500" />
          ) : (
            destination?.logo_url ? <img src={destination.logo_url} className="w-full h-full rounded-lg object-cover" alt="" /> : <Rocket size={14} className="text-zinc-500" />
          )}
        </div>
        <div className="min-w-0">
          <div className="text-[13px] font-bold text-white truncate">{invitation.destination_name}</div>
          <div className="text-[11px] text-zinc-500 capitalize">as {invitation.role}</div>
        </div>
      </div>

      {/* Action Links */}
      {invitation.status === 'accepted' && (
        <Link
          href={destType === 'project' ? `/projects/${destSlug}` : `/ventures/${destSlug}`}
          className="w-full h-9 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-[12.5px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
        >
          Open {destType === 'project' ? 'Project' : 'Venture'} <ArrowUpRight size={11} weight="bold" />
        </Link>
      )}

      {invitation.status === 'pending' && (
        <p className="text-[11.5px] text-zinc-500 italic">
          Waiting for {applicantName.split(' ')[0]} to respond...
        </p>
      )}
    </div>
  )
}