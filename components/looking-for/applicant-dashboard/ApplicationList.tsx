'use client'

import Link from 'next/link'
import {
  FileText,
  CheckCircle,
  PauseCircle,
  ChatCircle,
  Handshake,
  XCircle,
  ArrowUpRight,
  EnvelopeSimple,
  PencilSimple,
} from '@phosphor-icons/react'
import { DsrtPanel, DsrtEmpty, DsrtButton, DsrtChip } from '@/components/dsrt'
import { cn } from '@/lib/utils'

const STAGE_META: Record<string, { label: string; Icon: any; chip: 'neutral' | 'accent' | 'success' | 'warning' | 'danger' }> = {
  draft: { label: 'Draft', Icon: PencilSimple, chip: 'neutral' },
  submitted: { label: 'Submitted', Icon: CheckCircle, chip: 'neutral' },
  applied: { label: 'Submitted', Icon: CheckCircle, chip: 'neutral' },
  pending: { label: 'Pending', Icon: PauseCircle, chip: 'neutral' },
  reviewing: { label: 'Reviewing', Icon: PauseCircle, chip: 'accent' },
  screening: { label: 'Shortlisted', Icon: CheckCircle, chip: 'accent' },
  interviewing: { label: 'Interviewing', Icon: ChatCircle, chip: 'info' as any },
  offered: { label: 'Offer', Icon: Handshake, chip: 'warning' },
  hired: { label: 'Selected', Icon: CheckCircle, chip: 'success' },
  rejected: { label: 'Rejected', Icon: XCircle, chip: 'danger' },
  withdrawn: { label: 'Withdrawn', Icon: XCircle, chip: 'neutral' },
  'under-review': { label: 'Reviewing', Icon: PauseCircle, chip: 'accent' },
  shortlisted: { label: 'Shortlisted', Icon: CheckCircle, chip: 'accent' },
  interview: { label: 'Interviewing', Icon: ChatCircle, chip: 'accent' },
  offer: { label: 'Offer', Icon: Handshake, chip: 'warning' },
  accepted: { label: 'Selected', Icon: CheckCircle, chip: 'success' },
  declined: { label: 'Rejected', Icon: XCircle, chip: 'danger' },
}

function timeAgo(iso: string): string {
  if (!iso) return ''
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (secs < 60) return 'just now'
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return `${Math.floor(days / 7)}w ago`
}

export function ApplicationList({
  applications,
  filter,
  hasMore,
  loadingMore,
  onLoadMore,
}: {
  applications: any[]
  filter: string
  hasMore?: boolean
  loadingMore?: boolean
  onLoadMore?: () => void
}) {
  if (applications.length === 0) {
    return (
      <DsrtEmpty
        icon={FileText}
        title={`No ${filter !== 'all' ? filter + ' ' : ''}applications`}
        description={
          filter === 'drafts'
            ? "You don't have any in-progress applications."
            : 'When you apply for opportunities on DSRT, you can track their progress here.'
        }
        action={
          <DsrtButton asChild variant="white" size="sm">
            <Link href="/looking-for">Explore Opportunities</Link>
          </DsrtButton>
        }
      />
    )
  }

  return (
    <DsrtPanel padding="none" variant="default" className="overflow-hidden">
      <div className="px-4 sm:px-5 py-4 border-b border-white/[0.06]">
        <h3 className="text-[13px] font-semibold text-white">Your Applications</h3>
      </div>

      <div className="divide-y divide-white/[0.04]">
        {applications.map((app) => {
          const opp = app.opportunity
          if (!opp) return null

          const meta = STAGE_META[app.pipeline_stage] || STAGE_META.submitted
          const contextName = opp.project?.name || opp.venture?.name || null
          const isDraft = app.pipeline_stage === 'draft'
          const href = isDraft
            ? `/looking-for/${opp.id}/apply/${app.id}`
            : `/looking-for/my-applications/${app.id}`

          return (
            <Link
              key={app.id}
              href={href}
              className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-4 hover:bg-white/[0.02] transition-colors group"
            >
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-[#05070D] border border-white/[0.08] overflow-hidden flex items-center justify-center shrink-0">
                {opp.venture?.logo_url ? (
                  <img src={opp.venture.logo_url} alt="" className="w-full h-full object-cover" />
                ) : opp.project?.icon ? (
                  <span className="text-xl">{opp.project.icon}</span>
                ) : opp.cover_image_url ? (
                  <img src={opp.cover_image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[14px] font-bold text-white/40">
                    {(opp.title || '?').charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h4 className="text-[14px] sm:text-[15px] font-semibold text-white group-hover:text-[#93c5fd] transition-colors truncate max-w-full sm:max-w-md">
                    {opp.title}
                  </h4>
                  {isDraft && (
                    <DsrtChip size="sm" tone="neutral">
                      Draft
                    </DsrtChip>
                  )}
                  {app.unread_messages > 0 && (
                    <span className="inline-flex items-center gap-1 h-5 px-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#1e3a5f]/40 border border-[#2c5282]/40 text-[#93c5fd]">
                      <EnvelopeSimple size={10} weight="fill" />
                      {app.unread_messages} New
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[12px] text-white/40">
                  {contextName && (
                    <>
                      <span className="text-white/60 font-medium">{contextName}</span>
                      <span className="text-white/20">·</span>
                    </>
                  )}
                  <span className="capitalize">
                    {String(opp.opportunity_type || '').replace(/-/g, ' ')}
                  </span>
                  <span className="text-white/20">·</span>
                  <span>
                    {isDraft ? 'Started' : 'Applied'} {timeAgo(app.created_at)}
                  </span>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-3 text-right">
                <div className="hidden sm:block text-right">
                  <div
                    className={cn(
                      'inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border',
                      meta.chip === 'success' && 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
                      meta.chip === 'warning' && 'border-amber-500/30 bg-amber-500/10 text-amber-300',
                      meta.chip === 'danger' && 'border-red-500/30 bg-red-500/10 text-red-300',
                      meta.chip === 'accent' && 'border-[#2c5282]/40 bg-[#1e3a5f]/30 text-[#93c5fd]',
                      meta.chip === 'neutral' && 'border-white/[0.08] bg-white/[0.03] text-white/60',
                      (meta.chip as string) === 'info' && 'border-sky-500/30 bg-sky-500/10 text-sky-300'
                    )}
                  >
                    <meta.Icon size={12} weight={isDraft ? 'regular' : 'fill'} />
                    {meta.label}
                  </div>
                  <div className="text-[10px] font-mono text-white/30 mt-1 uppercase tracking-widest">
                    Updated {timeAgo(app.stage_updated_at || app.updated_at)}
                  </div>
                </div>

                <div className="w-8 h-8 rounded-lg border border-white/[0.08] bg-white/[0.03] flex items-center justify-center text-white/40 group-hover:bg-white/[0.08] group-hover:text-white transition-colors">
                  <ArrowUpRight size={14} weight="bold" />
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {hasMore && onLoadMore && (
        <div className="px-4 sm:px-5 py-4 border-t border-white/[0.06] flex justify-center">
          <DsrtButton
            variant="outline"
            size="sm"
            onClick={onLoadMore}
            loading={loadingMore}
          >
            {loadingMore ? 'Loading…' : 'Load more applications'}
          </DsrtButton>
        </div>
      )}
    </DsrtPanel>
  )
}