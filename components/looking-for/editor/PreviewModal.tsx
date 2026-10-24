'use client'

import { useEffect, useState } from 'react'
import { X, Desktop, DeviceMobile } from '@phosphor-icons/react'
import { PublicOpportunityRender } from '../public/PublicOpportunityRender'
import { PublicPosterRender, type PosterData, type PosterSkill, type PosterProject, type PosterVenture } from '../public/PublicPosterRender'
import type { DraftState } from './useDraftEditor'

interface Props {
  draft: DraftState
  onClose: () => void
}

type PreviewMode = 'desktop' | 'mobile'
type PreviewTab = 'opportunity' | 'about'

export function PreviewModal({ draft, onClose }: Props) {
  const [mode, setMode] = useState<PreviewMode>('desktop')
  const [tab, setTab] = useState<PreviewTab>('opportunity')

  const [poster, setPoster] = useState<PosterData | null>(null)
  const [skills, setSkills] = useState<PosterSkill[]>([])
  const [projects, setProjects] = useState<PosterProject[]>([])
  const [ventures, setVentures] = useState<PosterVenture[]>([])
  const [contextEntity, setContextEntity] = useState<any>(null)
  const [draftMedia, setDraftMedia] = useState<any[]>([])

  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', h)
      document.body.style.overflow = ''
    }
  }, [onClose])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const [meRes, contextRes, mediaRes] = await Promise.all([
          fetch('/api/looking-for/sidebar-me'),
          draft.context_type === 'venture' && draft.venture_id
            ? fetch(`/api/looking-for/preview-context?type=venture&id=${draft.venture_id}`).catch(() => null)
            : draft.context_type === 'project' && draft.project_id
            ? fetch(`/api/looking-for/preview-context?type=project&id=${draft.project_id}`).catch(() => null)
            : Promise.resolve(null),
          draft.id
            ? fetch(`/api/looking-for/drafts/${draft.id}/media`).catch(() => null)
            : Promise.resolve(null),
        ])

        const meData = await meRes.json().catch(() => ({}))
        if (cancelled) return
        setPoster(meData.user || null)
        setSkills(meData.skills || [])
        setProjects(meData.projects || [])
        setVentures(meData.ventures || [])

        if (contextRes && contextRes.ok) {
          const cx = await contextRes.json().catch(() => ({}))
          if (!cancelled) setContextEntity(cx.entity || null)
        }
        if (mediaRes && mediaRes.ok) {
          const md = await mediaRes.json().catch(() => ({}))
          if (!cancelled) setDraftMedia(md.media || [])
        }
      } catch { /* ignore */ }
    }
    load()
    return () => { cancelled = true }
  }, [draft.context_type, draft.venture_id, draft.project_id, draft.id])

  const opportunityItem = {
    title: draft.title,
    subline: draft.subline,
    cover_image_url: draft.cover_image_url,
    content_html: draft.content_html,
    request_type: draft.request_type || undefined,
    required_skills: draft.required_skills,
    nice_to_have_skills: draft.nice_to_have_skills,
    work_mode: draft.work_mode,
    location: draft.location,
    experience_level: draft.experience_level,
    employment_type: draft.employment_type,
    venture: draft.context_type === 'venture' ? contextEntity : null,
    project: draft.context_type === 'project' ? contextEntity : null,
    source_type: 'team_up',
    source_id: draft.id || undefined,
  } as any

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0a0a0a]">
      <header className="shrink-0 border-b border-zinc-800 bg-[#0a0a0a]/95 backdrop-blur">
        <div className="px-4 md:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-md flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
              aria-label="Close preview"
            >
              <X size={14} weight="bold" />
            </button>
            <div>
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-zinc-500 mb-0.5">
                Preview
              </div>
              <div className="text-[13px] font-medium text-zinc-200 truncate max-w-md">
                {draft.title || 'Untitled opportunity'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="inline-flex items-center rounded-md border border-zinc-800 bg-zinc-950 p-0.5">
              <ModeButton active={mode === 'desktop'} onClick={() => setMode('desktop')} Icon={Desktop} label="Desktop" />
              <ModeButton active={mode === 'mobile'} onClick={() => setMode('mobile')} Icon={DeviceMobile} label="Mobile" />
            </div>
          </div>
        </div>

        <div className="px-4 md:px-6">
          <div className="flex items-center gap-6">
            <TabButton active={tab === 'opportunity'} onClick={() => setTab('opportunity')}>Opportunity</TabButton>
            <TabButton active={tab === 'about'} onClick={() => setTab('about')}>About the Poster</TabButton>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto bg-zinc-950">
        <div className={'py-8 ' + (mode === 'mobile' ? 'px-4' : 'px-6')}>
          <div className={
            mode === 'mobile'
              ? 'max-w-[420px] mx-auto rounded-2xl border border-zinc-800 bg-[#0a0a0a] overflow-hidden shadow-2xl'
              : 'max-w-5xl mx-auto rounded-xl border border-zinc-800 bg-[#0a0a0a] overflow-hidden shadow-2xl'
          }>
            {tab === 'opportunity' ? (
              <PublicOpportunityRender
                item={opportunityItem}
                mode={mode}
                showApplyPlaceholder
              />
            ) : (
              <div className="p-6">
                {poster ? (
                  <PublicPosterRender
                    poster={poster}
                    skills={skills}
                    projects={projects}
                    ventures={ventures}
                    compact={mode === 'mobile'}
                  />
                ) : (
                  <div className="text-[13px] text-zinc-500 text-center py-10">Loading poster...</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ModeButton({
  active, onClick, Icon, label,
}: {
  active: boolean
  onClick: () => void
  Icon: any
  label: string
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={
        'inline-flex items-center justify-center gap-1.5 h-7 px-2.5 rounded text-[11.5px] font-medium transition-colors ' +
        (active ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300')
      }
    >
      <Icon size={12} weight="regular" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={
        'relative py-2.5 text-[13px] font-semibold tracking-tight transition-colors ' +
        (active ? 'text-white' : 'text-zinc-500 hover:text-zinc-300')
      }
    >
      {children}
      {active && (
        <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-white rounded-full" />
      )}
    </button>
  )
}
