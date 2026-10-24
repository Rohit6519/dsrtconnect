'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import {
  // Section header icons
  Info, ShieldCheck, Users,
  // At-a-Glance row icons
  Flag, Buildings, Briefcase, Calendar, UsersThree, MapPin, Heart, EyeSlash, Eye, Compass,
  // IP row icons
  Code, Certificate, Books, Flask, Lock, IdentificationCard, Storefront,
  // Actions
  Plus, PencilSimple, CaretRight,
} from '@phosphor-icons/react'

import { ProjectDomainTechEditor } from './widgets/ProjectDomainTechEditor'
import { DsrtPanel, DsrtAvatar, DsrtButton } from '@/components/dsrt'

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface ProjectLite {
  id: string
  slug: string
  stage: string | null
  industry: string | null
  project_type: string | null
  founded_date: string | null
  team_size: number | null
  open_roles: number | null
  location: string | null
  follower_count: number | null
  visibility: string | null
  is_public: boolean | null
  founder_id: string | null
  user_id: string | null
  // IP fields
  is_open_source: boolean | null
  license: string | null
  patent_status: string | null
  research_status: string | null
  has_proprietary_tech: boolean | null
  ip_ownership: string | null
  commercial_use: string | null
}

interface TeamMember {
  id: string
  user_id: string
  role: string
  joined_at: string
  full_name: string | null
  username: string | null
  avatar_url: string | null
  is_verified: boolean
}

interface LinkRow {
  id: string
  type: string
  label: string | null
  url: string
  position: number
}

interface Props {
  project: ProjectLite
  team: TeamMember[]
  /**
   * Links are still passed through so the global ProjectLinksFooter (rendered
   * in ProjectDetailPage) can use them. This component itself no longer renders
   * a Links panel — that section moved to a full-width footer under the page.
   */
  links: LinkRow[]
  isOwner: boolean
  onAddMember: () => void
  onAddLink: (type: string, url: string, label?: string) => Promise<void>
  onDeleteLink: (id: string) => Promise<void>
  onEditGlance: (field: string) => void
}

// ═══════════════════════════════════════════════════════════════════════════
// LABEL MAPS
// ═══════════════════════════════════════════════════════════════════════════

const STAGE_LABELS: Record<string, string> = {
  idea: 'Idea',
  research: 'Research',
  planning: 'Planning',
  prototype: 'Prototype',
  mvp: 'MVP',
  beta: 'Beta',
  production: 'Production',
  scaling: 'Scaling',
  completed: 'Completed',
  'on-hold': 'On Hold',
}

const PROJECT_TYPE_LABELS: Record<string, string> = {
  personal: 'Personal Project',
  startup: 'Startup',
  research: 'Research',
  hackathon: 'Hackathon',
  'open-source': 'Open Source',
  learning: 'Learning',
  portfolio: 'Portfolio',
  'client-work': 'Client Work',
  mvp: 'MVP',
  bootcamp: 'Bootcamp',
  'case-study': 'Case Study',
  community: 'Community',
  creative: 'Creative',
  experiment: 'Experiment',
}

const PATENT_LABELS: Record<string, string> = {
  none: 'None',
  pending: 'Pending',
  granted: 'Granted',
  filed: 'Filed',
}

const RESEARCH_LABELS: Record<string, string> = {
  none: 'None',
  ongoing: 'Ongoing',
  published: 'Published',
  peer_reviewed: 'Peer Reviewed',
}

const IP_OWNERSHIP_LABELS: Record<string, string> = {
  founder: 'Founder',
  organization: 'Organization',
  shared: 'Shared',
  university: 'University',
  public_domain: 'Public Domain',
}

const COMMERCIAL_LABELS: Record<string, string> = {
  commercial: 'Commercial',
  'non-commercial': 'Non-commercial',
  dual: 'Dual License',
  not_specified: 'Not specified',
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function formatFoundedDate(d: string | null): string {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleDateString('en', { month: 'short', year: 'numeric' })
  } catch {
    return '—'
  }
}

function labelFor(map: Record<string, string>, key: string | null | undefined): string {
  if (!key) return '—'
  return map[key] || key
}

function visibilityLabel(project: ProjectLite): string {
  if (project.is_public) return 'Public'
  if (project.visibility === 'unlisted') return 'Unlisted'
  return 'Private'
}

function visibilityIcon(project: ProjectLite) {
  if (project.is_public) return Compass
  if (project.visibility === 'unlisted') return Eye
  return EyeSlash
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function ProjectSidebar({
  project,
  team,
  links,
  isOwner,
  onAddMember,
  onAddLink,
  onDeleteLink,
  onEditGlance,
}: Props) {
  // links, onAddLink, onDeleteLink are still declared in props for backwards
  // compatibility — ProjectDetailPage passes them through, and the global
  // footer (ProjectLinksFooter) is the sole consumer now. Suppress unused warns.
  void links
  void onAddLink
  void onDeleteLink

  const teamCount = team?.length || 0
  const followerCount = project.follower_count || 0

  return (
    <div className="space-y-4">

      {/* ═════════════════════════════════════════════════════════════════
          1. AT A GLANCE
          ═════════════════════════════════════════════════════════════════ */}
      <SectionCard
        title="At a Glance"
        icon={<Info size={16} weight="fill" className="text-white/40" />}
      >
        <GlanceRow
          icon={<Flag size={14} weight="fill" className="text-white/40" />}
          label="Stage"
          value={project.stage ? labelFor(STAGE_LABELS, project.stage) : '—'}
          editable={isOwner}
          onEdit={() => onEditGlance('stage')}
        />
        <GlanceRow
          icon={<Buildings size={14} weight="fill" className="text-white/40" />}
          label="Industry"
          value={project.industry || '—'}
          editable={isOwner}
          onEdit={() => onEditGlance('industry')}
        />
        <GlanceRow
          icon={<Briefcase size={14} weight="fill" className="text-white/40" />}
          label="Project Type"
          value={project.project_type ? labelFor(PROJECT_TYPE_LABELS, project.project_type) : '—'}
          editable={isOwner}
          onEdit={() => onEditGlance('project_type')}
        />
        <GlanceRow
          icon={<Calendar size={14} weight="fill" className="text-white/40" />}
          label="Founded"
          value={formatFoundedDate(project.founded_date)}
          editable={isOwner}
          onEdit={() => onEditGlance('founded_date')}
        />
        <GlanceRow
          icon={<UsersThree size={14} weight="fill" className="text-white/40" />}
          label="Team Size"
          value={`${teamCount} member${teamCount !== 1 ? 's' : ''}`}
        />
        <GlanceRow
          icon={<Briefcase size={14} weight="fill" className="text-white/40" />}
          label="Open Roles"
          value={String(project.open_roles ?? 0)}
          editable={isOwner}
          onEdit={() => onEditGlance('open_roles')}
        />
        <GlanceRow
          icon={<MapPin size={14} weight="fill" className="text-white/40" />}
          label="Location"
          value={project.location || '—'}
          editable={isOwner}
          onEdit={() => onEditGlance('location')}
        />
        <GlanceRow
          icon={<Heart size={14} weight="fill" className="text-white/40" />}
          label="Followers"
          value={followerCount.toLocaleString()}
        />
        {(() => {
          const Icon = visibilityIcon(project)
          return (
            <GlanceRow
              icon={<Icon size={14} weight="fill" className="text-white/40" />}
              label="Visibility"
              value={visibilityLabel(project)}
              editable={isOwner}
              onEdit={() => onEditGlance('visibility')}
              isLast
            />
          )
        })()}
      </SectionCard>

      {/* ═════════════════════════════════════════════════════════════════
          2. INTELLECTUAL PROPERTY & OWNERSHIP
          ═════════════════════════════════════════════════════════════════ */}
      <SectionCard
        title="Intellectual Property"
        icon={<ShieldCheck size={16} weight="fill" className="text-white/40" />}
      >
        <GlanceRow
          icon={<Code size={14} weight="fill" className="text-white/40" />}
          label="Source"
          value={project.is_open_source ? 'Open Source' : 'Closed Source'}
          editable={isOwner}
          onEdit={() => onEditGlance('is_open_source')}
        />
        <GlanceRow
          icon={<Certificate size={14} weight="fill" className="text-white/40" />}
          label="License"
          value={project.license || 'None'}
          editable={isOwner}
          onEdit={() => onEditGlance('license')}
        />
        <GlanceRow
          icon={<Books size={14} weight="fill" className="text-white/40" />}
          label="Patent Status"
          value={labelFor(PATENT_LABELS, project.patent_status)}
          editable={isOwner}
          onEdit={() => onEditGlance('patent_status')}
        />
        <GlanceRow
          icon={<Flask size={14} weight="fill" className="text-white/40" />}
          label="Research Status"
          value={labelFor(RESEARCH_LABELS, project.research_status)}
          editable={isOwner}
          onEdit={() => onEditGlance('research_status')}
        />
        <GlanceRow
          icon={<Lock size={14} weight="fill" className="text-white/40" />}
          label="Proprietary Tech"
          value={project.has_proprietary_tech ? 'Yes' : 'No'}
          editable={isOwner}
          onEdit={() => onEditGlance('has_proprietary_tech')}
        />
        <GlanceRow
          icon={<IdentificationCard size={14} weight="fill" className="text-white/40" />}
          label="IP Ownership"
          value={labelFor(IP_OWNERSHIP_LABELS, project.ip_ownership)}
          editable={isOwner}
          onEdit={() => onEditGlance('ip_ownership')}
        />
        <GlanceRow
          icon={<Storefront size={14} weight="fill" className="text-white/40" />}
          label="Commercial Use"
          value={labelFor(COMMERCIAL_LABELS, project.commercial_use)}
          editable={isOwner}
          onEdit={() => onEditGlance('commercial_use')}
          isLast
        />
      </SectionCard>

      {/* ═════════════════════════════════════════════════════════════════
          3. DOMAINS & TECHNOLOGIES (unchanged existing widget)
          ═════════════════════════════════════════════════════════════════ */}
      <ProjectDomainTechEditor slug={project.slug} isOwner={isOwner} />

      {/* ═════════════════════════════════════════════════════════════════
          4. TEAM
          NOTE: Links panel has been REMOVED — it now renders as a global
          full-width footer (ProjectLinksFooter) below every tab in
          ProjectDetailPage. Do NOT re-add Links here.
          ═════════════════════════════════════════════════════════════════ */}
      <SectionCard
        title="Team"
        icon={<Users size={16} weight="fill" className="text-white/40" />}
        badge={teamCount > 0 ? String(teamCount) : undefined}
      >
        {teamCount === 0 ? (
          <div className="px-4 py-5 text-center text-[12.5px] text-white/40">
            {isOwner ? 'No team members yet.' : 'Solo project.'}
          </div>
        ) : (
          <div className="divide-y divide-white/[0.05]">
            {team.slice(0, 5).map((m, i) => (
              <TeamMemberRow
                key={m.id}
                member={m}
                isLast={
                  i === Math.min(team.length, 5) - 1 &&
                  teamCount <= 5 &&
                  !isOwner
                }
              />
            ))}
            {teamCount > 5 && (
              <Link
                href={`/projects/${project.slug}?tab=team`}
                className="flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.02] transition-colors group"
              >
                <span className="text-[12.5px] font-semibold text-white/60 group-hover:text-white">
                  View all {teamCount} members
                </span>
                <CaretRight
                  size={13}
                  weight="bold"
                  className="text-white/40 group-hover:text-white"
                />
              </Link>
            )}
          </div>
        )}

        {isOwner && (
          <div className="px-4 py-2.5 border-t border-white/[0.05]">
            <button
              onClick={onAddMember}
              className="w-full flex items-center justify-center gap-1.5 h-9 rounded-md text-[12.5px] font-semibold text-white/70 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-colors"
            >
              <Plus size={12} weight="bold" /> Add team member
            </button>
          </div>
        )}
      </SectionCard>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Reusable section shell — dark padded panel with header + optional badge
 */
function SectionCard({
  title,
  icon,
  badge,
  children,
}: {
  title: string
  icon?: React.ReactNode
  badge?: string
  children: React.ReactNode
}) {
  return (
    <DsrtPanel padding="none" variant="default" className="overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-[15px] font-semibold text-white tracking-tight">
            {title}
          </h3>
        </div>
        {badge && (
          <span className="text-[11.5px] font-mono font-semibold text-white/40 bg-white/[0.05] border border-white/[0.06] px-2 py-0.5 rounded">
            {badge}
          </span>
        )}
      </div>
      <div>{children}</div>
    </DsrtPanel>
  )
}

/**
 * Single-line row: [icon] label ......... value [pencil-hint if editable]
 * Tightened vertical padding: py-3 → py-2
 */
function GlanceRow({
  icon,
  label,
  value,
  editable,
  onEdit,
  isLast,
}: {
  icon: React.ReactNode
  label: string
  value: string
  editable?: boolean
  onEdit?: () => void
  isLast?: boolean
}) {
  const Wrapper: any = editable ? 'button' : 'div'

  return (
    <Wrapper
      onClick={editable ? onEdit : undefined}
      className={
        'w-full flex items-center justify-between gap-3 px-4 py-2 text-left ' +
        (editable
          ? 'cursor-pointer hover:bg-white/[0.03] transition-colors group'
          : '') +
        (isLast ? '' : ' border-b border-white/[0.04]')
      }
    >
      <div className="flex items-center gap-2 min-w-0">
        {icon}
        <span className="text-[11.5px] font-mono uppercase tracking-wider text-white/45">
          {label}
        </span>
      </div>
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-[13.5px] font-semibold text-white truncate max-w-[160px] text-right">
          {value}
        </span>
        {editable && (
          <PencilSimple
            size={12}
            weight="fill"
            className="text-white/25 group-hover:text-white/70 transition-colors shrink-0"
          />
        )}
      </div>
    </Wrapper>
  )
}

/**
 * Team row — avatar + name + role. Tightened padding to py-2.5.
 */
function TeamMemberRow({
  member,
  isLast,
}: {
  member: TeamMember
  isLast?: boolean
}) {
  return (
    <Link
      href={`/profile/${member.username || member.user_id}`}
      className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.02] transition-colors"
    >
      <DsrtAvatar
        src={member.avatar_url}
        name={member.full_name || ''}
        size="sm"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <p className="text-[13.5px] font-semibold text-white truncate">
            {member.full_name || member.username || 'Member'}
          </p>
          {member.is_verified && (
            <span
              className="w-1.5 h-1.5 rounded-full bg-[#93c5fd] shrink-0"
              title="Verified"
            />
          )}
        </div>
        {member.role && (
          <p className="text-[11.5px] text-white/45 truncate mt-0.5">
            {member.role}
          </p>
        )}
      </div>
      <CaretRight
        size={13}
        weight="bold"
        className="text-white/25 shrink-0"
      />
    </Link>
  )
}