'use client'

import Link from 'next/link'
import Image from 'next/image'
import { BookmarkSimple, Clock, MapPin, Users } from '@phosphor-icons/react'
import { DsrtPanel, DsrtChip, DsrtButton } from '@/components/dsrt'
import { cn } from '@/lib/utils'

interface Opportunity {
  id: string
  slug: string
  title: string
  subtitle?: string | null
  description?: string | null
  opportunity_type: string
  required_skills?: string[]
  compensation_type?: string
  compensation_min?: number | null
  compensation_max?: number | null
  compensation_currency?: string
  time_commitment?: string | null
  work_mode?: string | null
  location?: string | null
  project_length?: string | null
  application_count?: number
  published_at?: string | null
  poster?: {
    id: string
    username: string
    full_name: string
    avatar_url: string | null
    is_verified?: boolean
  } | null
  project?: {
    id: string
    slug: string
    name: string
    icon?: string | null
    cover_image_url?: string | null
  } | null
  venture?: {
    id: string
    slug: string
    name: string
    logo_url: string | null
  } | null
  is_saved?: boolean
  has_applied?: boolean
}

interface Props {
  opportunity: Opportunity
  onSave?: (id: string, currentlySaved: boolean) => void
}

const TYPE_LABELS: Record<string, string> = {
  hire: 'Hire',
  freelance: 'Freelance',
  'part-time': 'Part-time',
  'full-time': 'Full-time',
  contract: 'Contract',
  'project-collaboration': 'Project Collab',
  'team-up': 'Team Up',
  cofounder: 'Co-founder',
  mentorship: 'Mentorship',
}

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return ''
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (secs < 60) return 'Just now'
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  return `${weeks}w ago`
}

export function OpportunityCard({ opportunity, onSave }: Props) {
  const type = TYPE_LABELS[opportunity.opportunity_type] || opportunity.opportunity_type
  const posterName = opportunity.poster?.full_name || opportunity.poster?.username || 'Anonymous'
  const posterContext = opportunity.project?.name || opportunity.venture?.name || null
  const appCount = opportunity.application_count || 0
  const isNew =
    !!opportunity.published_at &&
    Date.now() - new Date(opportunity.published_at).getTime() < 24 * 60 * 60 * 1000

  const handleSave = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (onSave) onSave(opportunity.id, opportunity.is_saved || false)
  }

  return (
    <Link href={`/looking-for/${opportunity.slug}?source=feed`} className="block group">
      <DsrtPanel
        variant="default"
        padding="none"
        className="transition-all duration-200 hover:border-white/[0.14] group-hover:-translate-y-0.5"
      >
        <div className="p-4 sm:p-5 flex flex-col md:flex-row gap-4 sm:gap-5">
          <div className="shrink-0 hidden sm:block">
            <ContextIcon opportunity={opportunity} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {isNew && (
                <DsrtChip size="sm" tone="success">
                  New
                </DsrtChip>
              )}
              <span className="text-[11px] font-mono uppercase tracking-wider text-white/40">
                {type} · {timeAgo(opportunity.published_at)}
              </span>
            </div>

            <h3 className="text-[16px] sm:text-[18px] font-bold text-white leading-tight line-clamp-2 mb-1.5 tracking-tight group-hover:text-[#93c5fd] transition-colors">
              {opportunity.title}
            </h3>

            <div className="text-[13px] text-white/50 mb-3 truncate flex items-center gap-1.5">
              <span className="text-white/80 font-medium">{posterName}</span>
              {posterContext && (
                <>
                  <span className="text-white/20">·</span>
                  <span>{posterContext}</span>
                </>
              )}
            </div>

            {(opportunity.subtitle || opportunity.description) && (
              <p className="text-[13px] text-white/60 leading-relaxed line-clamp-2 mb-4">
                {opportunity.subtitle || opportunity.description}
              </p>
            )}

            {opportunity.required_skills && opportunity.required_skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {opportunity.required_skills.slice(0, 5).map((s: string) => (
                  <DsrtChip key={s} size="sm" tone="neutral">
                    {s}
                  </DsrtChip>
                ))}
                {opportunity.required_skills.length > 5 && (
                  <DsrtChip size="sm" tone="neutral">
                    +{opportunity.required_skills.length - 5}
                  </DsrtChip>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-[12px] text-white/45 font-medium">
              {opportunity.work_mode && (
                <span className="flex items-center gap-1.5 capitalize">
                  <MapPin size={13} className="text-white/30" />
                  {opportunity.work_mode}
                </span>
              )}
              {opportunity.time_commitment && (
                <span className="flex items-center gap-1.5">
                  <Clock size={13} className="text-white/30" />
                  {opportunity.time_commitment.replace(/-/g, ' ')}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Users size={13} className="text-white/30" />
                {appCount} {appCount === 1 ? 'applicant' : 'applicants'}
              </span>
            </div>
          </div>

          <div className="shrink-0 flex flex-row md:flex-col items-center md:items-end justify-between md:justify-start gap-3 border-t md:border-t-0 md:border-l border-white/[0.06] pt-3 md:pt-0 md:pl-5 min-w-0 md:min-w-[140px]">
            <button
              onClick={handleSave}
              aria-label={opportunity.is_saved ? 'Unsave' : 'Save'}
              className={cn(
                'w-9 h-9 rounded-xl border flex items-center justify-center transition-all',
                opportunity.is_saved
                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                  : 'border-white/[0.1] bg-white/[0.03] text-white/50 hover:text-white hover:border-white/[0.2]'
              )}
            >
              <BookmarkSimple size={16} weight={opportunity.is_saved ? 'fill' : 'bold'} />
            </button>

            <div className="h-9 px-4 rounded-xl border border-white/[0.1] bg-gradient-to-b from-[#1e3a5f] to-[#2c5282] text-white text-[12px] font-semibold flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
              View details
            </div>
          </div>
        </div>
      </DsrtPanel>
    </Link>
  )
}

function ContextIcon({ opportunity }: { opportunity: Opportunity }) {
  const projectLogo = opportunity.project?.cover_image_url
  const projectIcon = opportunity.project?.icon
  const ventureLogo = opportunity.venture?.logo_url
  const wrapClasses =
    'w-14 h-14 rounded-2xl overflow-hidden border border-white/[0.1] relative bg-gradient-to-b from-[#0f172a] to-[#0a0a0f] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] flex items-center justify-center'

  if (projectLogo) {
    return (
      <div className={wrapClasses}>
        <Image src={projectLogo} alt="" fill className="object-cover" sizes="56px" />
      </div>
    )
  }
  if (ventureLogo) {
    return (
      <div className={wrapClasses}>
        <Image src={ventureLogo} alt="" fill className="object-cover" sizes="56px" />
      </div>
    )
  }
  if (projectIcon) {
    return <div className={wrapClasses + ' text-2xl'}>{projectIcon}</div>
  }

  const initial = (opportunity.poster?.full_name || opportunity.title || '?').charAt(0).toUpperCase()
  return (
    <div className={wrapClasses + ' text-[18px] font-bold text-white/70'}>{initial}</div>
  )
}