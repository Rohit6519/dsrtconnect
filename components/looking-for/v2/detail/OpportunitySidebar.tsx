'use client'

import { CheckCircle, Clock, MapPin, Users, CalendarBlank } from '@phosphor-icons/react'
import { SmartApplyButton } from '@/components/looking-for/application-studio/SmartApplyButton'

interface Props {
  opportunity: any
  isOwner: boolean
  isClosed: boolean
  hasApplied: boolean
  onApply: () => void
}

export function OpportunitySidebar({
  opportunity, isOwner, isClosed,
}: Props) {
  const comp = formatCompensation(opportunity)

  return (
    <div className={
      'rounded-xl border border-zinc-800/60 overflow-hidden ' +
      'bg-gradient-to-b from-zinc-900/40 via-zinc-950/40 to-zinc-950/60 ' +
      'shadow-[0_1px_0_rgba(255,255,255,0.03)_inset,0_4px_24px_rgba(0,0,0,0.4)]'
    }>
      {/* Compensation block */}
      {comp && (
        <div className="p-5 border-b border-zinc-800 bg-gradient-to-b from-zinc-900/50 to-transparent">
          <div className="text-[10.5px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
            {comp.line}
          </div>
          {comp.sub && (
            <div className="text-[20px] font-bold text-emerald-400 leading-tight">
              {comp.sub}
            </div>
          )}
        </div>
      )}

      {/* Apply CTA */}
      <div className="p-5 space-y-3">
        <SmartApplyButton
          opportunity={opportunity}
          isOwner={isOwner}
          isClosed={isClosed}
        />

        <div className="text-[11.5px] text-zinc-500 text-center">
          {opportunity.application_count || 0} {opportunity.application_count === 1 ? 'applicant' : 'applicants'} so far
        </div>
      </div>

      {/* Details */}
      <div className="border-t border-zinc-800 p-5 space-y-3">
        <h3 className="text-[10.5px] font-bold uppercase tracking-wider text-zinc-500 mb-3">
          Details
        </h3>

        {opportunity.positions_open && (
          <DetailRow Icon={Users} label="Positions" value={String(opportunity.positions_open)} />
        )}
        {opportunity.hours_per_week && (
          <DetailRow Icon={Clock} label="Hours/week" value={String(opportunity.hours_per_week) + ' hrs'} />
        )}
        {opportunity.location && (
          <DetailRow Icon={MapPin} label="Location" value={opportunity.location} />
        )}
        {opportunity.application_deadline && (
          <DetailRow
            Icon={CalendarBlank}
            label="Deadline"
            value={new Date(opportunity.application_deadline).toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric',
            })}
          />
        )}
        {opportunity.start_date && (
          <DetailRow
            Icon={CalendarBlank}
            label="Start date"
            value={new Date(opportunity.start_date).toLocaleDateString('en-US', {
              month: 'short', day: 'numeric',
            })}
          />
        )}
      </div>

      {/* Requirements */}
      {(opportunity.require_resume || opportunity.require_portfolio ||
        opportunity.require_github || opportunity.require_cover_letter || opportunity.require_website) && (
        <div className="border-t border-zinc-800 p-5">
          <h3 className="text-[10.5px] font-bold uppercase tracking-wider text-zinc-500 mb-3">
            Application requires
          </h3>
          <ul className="space-y-1.5 text-[12.5px] text-zinc-300">
            {opportunity.require_cover_letter && <li className="flex items-center gap-1.5"><CheckCircle size={11} weight="fill" className="text-zinc-500" />Cover letter</li>}
            {opportunity.require_resume && <li className="flex items-center gap-1.5"><CheckCircle size={11} weight="fill" className="text-zinc-500" />Resume</li>}
            {opportunity.require_portfolio && <li className="flex items-center gap-1.5"><CheckCircle size={11} weight="fill" className="text-zinc-500" />Portfolio</li>}
            {opportunity.require_github && <li className="flex items-center gap-1.5"><CheckCircle size={11} weight="fill" className="text-zinc-500" />GitHub profile</li>}
            {opportunity.require_website && <li className="flex items-center gap-1.5"><CheckCircle size={11} weight="fill" className="text-zinc-500" />Personal website</li>}
          </ul>
        </div>
      )}

      {/* Stats */}
      <div className="border-t border-zinc-800 p-5">
        <h3 className="text-[10.5px] font-bold uppercase tracking-wider text-zinc-500 mb-3">
          Activity
        </h3>
        <div className="grid grid-cols-3 gap-2 text-center">
          <StatCell value={opportunity.view_count || 0} label="Views" />
          <StatCell value={opportunity.save_count || 0} label="Saves" />
          <StatCell value={opportunity.application_count || 0} label="Apps" />
        </div>
      </div>
    </div>
  )
}

function DetailRow({ Icon, label, value }: { Icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon size={12} weight="regular" className="text-zinc-500 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-[11px] text-zinc-500">{label}</div>
        <div className="text-[13px] text-zinc-200 font-medium truncate">{value}</div>
      </div>
    </div>
  )
}

function StatCell({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="text-[15px] font-bold text-white">{value.toLocaleString()}</div>
      <div className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 mt-0.5">{label}</div>
    </div>
  )
}

function formatCompensation(o: any): { line: string; sub: string | null } | null {
  if (o.compensation_type === 'unpaid' || o.compensation_type === 'volunteer') {
    return { line: 'Compensation', sub: 'Unpaid' }
  }
  if (o.compensation_type === 'collaboration') {
    return { line: 'Compensation', sub: 'Collaboration' }
  }
  if (o.compensation_type === 'equity') {
    if (o.equity_min && o.equity_max) {
      return { line: 'Equity offered', sub: `${o.equity_min}% – ${o.equity_max}%` }
    }
    return { line: 'Equity offered', sub: 'Negotiable' }
  }
  if (o.compensation_min || o.compensation_max) {
    const curr = o.compensation_currency === 'USD' ? '$' : (o.compensation_currency || '')
    let period = ''
    if (o.compensation_type === 'hourly') period = ' / hr'
    else if (o.compensation_type === 'annual') period = ' / year'
    else if (o.compensation_type === 'monthly') period = ' / mo'

    if (o.compensation_type === 'hourly') {
      const minH = o.compensation_min ? `${curr}${o.compensation_min}` : ''
      const maxH = o.compensation_max ? `${curr}${o.compensation_max}` : ''
      return { line: 'Compensation', sub: `${minH}${maxH ? ` – ${maxH}` : ''}${period}` }
    }

    const min = o.compensation_min ? `${curr}${(o.compensation_min / 1000).toFixed(0)}K` : ''
    const max = o.compensation_max ? `${curr}${(o.compensation_max / 1000).toFixed(0)}K` : ''
    return { line: 'Compensation', sub: `${min}${max ? ` – ${max}` : ''}${period}` }
  }
  return { line: 'Compensation', sub: 'Negotiable' }
}