'use client'

import { useState, useEffect } from 'react'
import {
  DotsThree, ArrowUpRight, Eye, Users, BookmarkSimple,
  ShareNetwork, Pulse, Sparkle,
} from '@phosphor-icons/react'
import { OpportunityStatusActions } from './OpportunityStatusActions'

interface Props {
  opportunity: any
  onManage: () => void
  onView: () => void
  onRefresh: () => void
}

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  'active': { label: 'Active', className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' },
  'closing-soon': { label: 'Closing soon', className: 'border-orange-500/30 bg-orange-500/10 text-orange-400' },
  'draft': { label: 'Draft', className: 'border-zinc-700 bg-zinc-900 text-zinc-400' },
  'paused': { label: 'Paused', className: 'border-amber-500/30 bg-amber-500/10 text-amber-400' },
  'filled': { label: 'Filled', className: 'border-blue-500/30 bg-blue-500/10 text-blue-400' },
  'closed': { label: 'Closed', className: 'border-zinc-700 bg-zinc-900 text-zinc-500' },
  'expired': { label: 'Expired', className: 'border-zinc-700 bg-zinc-900 text-zinc-500' },
  'archived': { label: 'Archived', className: 'border-zinc-700 bg-zinc-900 text-zinc-500' },
}

const TYPE_LABELS: Record<string, string> = {
  'hire': 'Hire',
  'freelance': 'Freelance',
  'part-time': 'Part-time',
  'full-time': 'Full-time',
  'contract': 'Contract',
  'project-collaboration': 'Project Collab',
  'team-up': 'Team Up',
  'cofounder': 'Co-founder',
  'mentorship': 'Mentorship',
  'research': 'Research',
  'open-source': 'Open Source',
  'volunteer': 'Volunteer',
  'consulting': 'Consulting',
}

function timeAgo(iso?: string | null): string {
  if (!iso) return '—'
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

export function OpportunityRow({ opportunity, onManage, onView, onRefresh }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const badge = STATUS_BADGES[opportunity.status] || STATUS_BADGES.active
  const contextName = opportunity.project?.name || opportunity.venture?.name || null
  const type = TYPE_LABELS[opportunity.opportunity_type] || opportunity.opportunity_type
  const conversion = Number(opportunity.conversion_rate || 0)
  const matchQ = Number(opportunity.match_quality_avg || 0)

  useEffect(() => {
    if (!menuOpen) return
    const close = () => setMenuOpen(false)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [menuOpen])

  return (
    <div className="group relative rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-[#18181b] via-[#121215] to-[#0f0f11] hover:border-zinc-600/80 transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_4px_20px_rgba(0,0,0,0.4)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_8px_28px_rgba(0,0,0,0.55)]">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-zinc-700/40 to-transparent" />

      <div className="p-5 md:p-6">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="w-12 h-12 rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800 shrink-0 flex items-center justify-center shadow-inner">
            {opportunity.venture?.logo_url ? (
              <img src={opportunity.venture.logo_url} alt="" className="w-full h-full object-cover" />
            ) : opportunity.project?.icon ? (
              <span className="text-lg">{opportunity.project.icon}</span>
            ) : opportunity.cover_image_url ? (
              <img src={opportunity.cover_image_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-[14px] font-bold text-zinc-500">
                {(opportunity.title || '?').charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          {/* Main */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="text-[10.5px] font-semibold uppercase tracking-wider text-zinc-500">
                {type}
              </span>
              {opportunity.opportunity_number && (
                <>
                  <span className="text-zinc-700">·</span>
                  <span className="text-[10.5px] font-mono text-zinc-500">
                    {opportunity.opportunity_number}
                  </span>
                </>
              )}
              <span className={
                'inline-flex items-center h-5 px-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ' +
                badge.className
              }>
                {badge.label}
              </span>
            </div>

            <button
              onClick={onManage}
              className="text-[16px] md:text-[17px] font-bold text-white hover:text-blue-400 text-left transition-colors leading-snug"
            >
              {opportunity.title}
            </button>

            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[12px] text-zinc-500">
              {contextName && <span className="text-zinc-400 font-medium">{contextName}</span>}
              {contextName && <span className="text-zinc-700">·</span>}
              <span>Posted {timeAgo(opportunity.published_at || opportunity.created_at)}</span>
              <span className="text-zinc-700">·</span>
              <span>Last activity {timeAgo(opportunity.last_activity_at)}</span>
              {opportunity.application_deadline && (
                <>
                  <span className="text-zinc-700">·</span>
                  <span>
                    Closes {new Date(opportunity.application_deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </>
              )}
            </div>

            {/* Pipeline strip */}
            <div className="mt-4 flex flex-wrap gap-2">
              <Pill tone="blue" label={`${opportunity.application_count || 0} Applicants`} />
              <Pill tone="cyan" label={`${opportunity.qualified_count || 0} Qualified`} />
              <Pill tone="purple" label={`${opportunity.shortlisted_count || 0} Shortlisted`} />
              <Pill tone="amber" label={`${opportunity.interviewing_count || 0} Interview`} />
              <Pill tone="emerald" label={`${opportunity.selected_count || 0} Selected`} />
            </div>

            {/* Metrics row */}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
              <Metric icon={Eye} label="Views" value={opportunity.view_count || 0} />
              <Metric icon={Users} label="Unique" value={opportunity.unique_view_count || 0} />
              <Metric icon={BookmarkSimple} label="Saves" value={opportunity.save_count || 0} />
              <Metric icon={ShareNetwork} label="Shares" value={opportunity.share_count || 0} />
              <Metric icon={Pulse} label="Conversion" value={`${conversion}%`} accent="emerald" />
              <Metric icon={Sparkle} label="Match quality" value={matchQ ? `${matchQ}%` : '—'} accent="blue" />
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            <button
              onClick={onManage}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-white text-black hover:bg-zinc-100 text-[12.5px] font-bold transition-all shadow-[0_2px_12px_rgba(255,255,255,0.1)]"
            >
              Manage
              <ArrowUpRight size={11} weight="bold" />
            </button>
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen) }}
                className="w-9 h-9 rounded-xl border border-zinc-800 hover:border-zinc-600 flex items-center justify-center text-zinc-400 hover:text-white transition-colors bg-zinc-950/50"
              >
                <DotsThree size={16} weight="bold" />
              </button>
              {menuOpen && (
                <OpportunityStatusActions
                  opportunity={opportunity}
                  onClose={() => setMenuOpen(false)}
                  onRefresh={onRefresh}
                  onView={onView}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Pill({ label, tone }: { label: string; tone: string }) {
  const map: Record<string, string> = {
    blue: 'border-blue-500/20 bg-blue-500/10 text-blue-300',
    cyan: 'border-cyan-500/20 bg-cyan-500/10 text-cyan-300',
    purple: 'border-purple-500/20 bg-purple-500/10 text-purple-300',
    amber: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
    emerald: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
  }
  return (
    <span className={'inline-flex items-center h-6 px-2 rounded-md text-[11px] font-semibold border ' + (map[tone] || map.blue)}>
      {label}
    </span>
  )
}

function Metric({
  icon: Icon, label, value, accent,
}: {
  icon: any
  label: string
  value: string | number
  accent?: 'emerald' | 'blue'
}) {
  return (
    <div className="rounded-xl border border-zinc-800/70 bg-zinc-950/40 px-2.5 py-2">
      <div className="flex items-center gap-1 text-zinc-600 mb-0.5">
        <Icon size={10} />
        <span className="text-[9.5px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <div className={
        'text-[13px] font-bold ' +
        (accent === 'emerald' ? 'text-emerald-400' : accent === 'blue' ? 'text-blue-400' : 'text-white')
      }>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
    </div>
  )
}