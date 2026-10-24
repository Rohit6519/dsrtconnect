'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { DotsThree, MapPin, Users, CheckCircle, GitBranch, Wrench } from '@phosphor-icons/react'
import { DsrtPanel, DsrtButton, DsrtChip } from '@/components/dsrt'

export interface ProjectHorizontalCardData {
  id: string
  slug: string
  name: string
  tagline?: string | null
  short_description?: string | null
  description?: string | null
  logo_url?: string | null
  cover_image_url?: string | null
  stage?: string | null
  status?: string | null
  industry?: string | null
  location?: string | null
  project_number?: string | null
  is_open_source?: boolean
  is_dsrt_verified?: boolean
  is_hiring?: boolean
  license?: string | null
  team_size?: number | null
  open_roles?: number | null
  follower_count?: number | null
  tech_stack?: string[] | null
  category?: string[] | null
  technologies?: string[]
  domains?: string[]
}

interface Props {
  project: ProjectHorizontalCardData
  onDeleteRequest: (v: ProjectHorizontalCardData) => void
  showActionButtons?: boolean
}

const STAGE_LABELS: Record<string, string> = {
  idea: 'Idea', planning: 'Planning', prototype: 'Prototype', development: 'Development',
  mvp: 'MVP', launched: 'Launched', completed: 'Completed', 'on-hold': 'On Hold',
}

export function ProjectHorizontalCard({ project, onDeleteRequest }: Props) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleCardClick = () => router.push(`/projects/${project.slug}`)

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation()
    const url = `${window.location.origin}/projects/${project.slug}`
    navigator.clipboard.writeText(url)
    toast.success('Project link copied')
    setMenuOpen(false)
  }

  const stageLabel = project.stage ? (STAGE_LABELS[project.stage] || project.stage) : null
  const domainTags = project.domains?.length ? project.domains : (project.category || [project.industry].filter(Boolean) as string[])
  const techTags = project.technologies?.length ? project.technologies : (project.tech_stack || [])

  return (
    <DsrtPanel
      variant="default"
      padding="none"
      onClick={handleCardClick}
      className="group cursor-pointer hover:border-white/[0.12] transition-all p-4 sm:p-5 flex flex-col md:flex-row gap-4 sm:gap-5"
    >
      {/* Cover */}
      <div className="w-full md:w-[180px] h-[120px] rounded-xl bg-[#05070D] border border-white/[0.08] overflow-hidden flex-shrink-0 relative">
        {project.cover_image_url ? (
          <img src={project.cover_image_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-white/[0.02]">
            <Wrench size={28} className="text-white/20" />
          </div>
        )}

        {project.logo_url && (
          <div className="absolute bottom-2 left-2 w-9 h-9 rounded-lg border border-white/[0.12] shadow-lg bg-[#05070D] overflow-hidden">
            <img src={project.logo_url} alt="" className="w-full h-full object-cover" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-3 mb-1">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-[16px] font-semibold text-white truncate tracking-tight">{project.name}</h3>
                {project.is_dsrt_verified && <CheckCircle size={14} weight="fill" className="text-[#93c5fd] shrink-0" />}
              </div>
              {(project.tagline || project.short_description) && (
                <p className="text-[13px] text-white/60 truncate mt-0.5">{project.tagline || project.short_description}</p>
              )}
            </div>

            <div className="relative shrink-0">
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen) }}
                className="w-8 h-8 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.08] flex items-center justify-center transition-colors"
              >
                <DotsThree size={20} weight="bold" />
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={(e) => { e.stopPropagation(); setMenuOpen(false) }} />
                  <div className="absolute right-0 top-full mt-1 z-40 w-48 bg-[#0a0f1a] border border-white/[0.1] rounded-xl shadow-2xl p-1 space-y-0.5">
                    <button onClick={(e) => { e.stopPropagation(); router.push(`/projects/${project.slug}`) }} className="w-full text-left px-3 py-1.5 text-[12px] font-medium text-white/80 hover:text-white hover:bg-white/[0.06] rounded-lg">Open project</button>
                    <button onClick={(e) => { e.stopPropagation(); router.push(`/projects/${project.slug}?tab=settings`) }} className="w-full text-left px-3 py-1.5 text-[12px] font-medium text-white/80 hover:text-white hover:bg-white/[0.06] rounded-lg">Edit project</button>
                    <button onClick={handleCopyLink} className="w-full text-left px-3 py-1.5 text-[12px] font-medium text-white/80 hover:text-white hover:bg-white/[0.06] rounded-lg">Share link</button>
                    <div className="h-px bg-white/[0.06] my-1" />
                    <button onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDeleteRequest(project) }} className="w-full text-left px-3 py-1.5 text-[12px] font-medium text-red-400 hover:bg-red-500/10 rounded-lg">Archive project</button>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap my-2">
            {domainTags.slice(0, 2).map((d, i) => (
              <DsrtChip key={i} size="sm" tone="accent">{d}</DsrtChip>
            ))}
            {stageLabel && <DsrtChip size="sm" tone="neutral">{stageLabel}</DsrtChip>}
            {project.location && (
              <span className="text-[11px] text-white/40 flex items-center gap-1">
                <MapPin size={11} /> {project.location}
              </span>
            )}
          </div>

          {techTags.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap mb-2">
              {techTags.slice(0, 4).map((t, i) => (
                <span key={i} className="text-[10px] font-mono text-white/40 bg-white/[0.03] px-1.5 py-0.5 rounded border border-white/[0.04]">{t}</span>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-3 pt-3 border-t border-white/[0.04] flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4 text-[11px] text-white/50 font-mono">
            <span>Team: <strong>{project.team_size || 1}</strong></span>
            {project.is_open_source && (
              <span className="flex items-center gap-1"><GitBranch size={11} /> OSS</span>
            )}
          </div>

          <DsrtButton size="xs" variant="outline" onClick={(e) => { e.stopPropagation(); router.push(`/projects/${project.slug}`) }}>
            Open
          </DsrtButton>
        </div>
      </div>
    </DsrtPanel>
  )
}