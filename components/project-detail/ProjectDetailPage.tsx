'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  LockKey, WarningCircle, ArrowClockwise, House, MagnifyingGlass,
} from '@phosphor-icons/react'

import { ProjectHeader } from './ProjectHeader'
import { ProjectSidebar } from './ProjectSidebar'
import { ProjectCompletion } from './ProjectCompletion'
import { ProjectAbout } from './ProjectAbout'
import { ProjectUpdates } from './ProjectUpdates'
import { ProjectUpdatesPreview } from './ProjectUpdatesPreview'
import { ProjectLinksFooter } from './ProjectLinksFooter'
import { ProjectUpdateComposer } from './ProjectUpdateComposer'
import { ProjectReviews } from './ProjectReviews'
import { ProjectDocumentation } from './ProjectDocumentation'
import { ProjectSettings } from './ProjectSettings'
import { AddMemberModal } from './AddMemberModal'
import { GlanceEditModal } from './GlanceEditModal'
import { TeamStructureTab } from './team/TeamStructureTab'
import { ApplicantsTab } from './applicants/ApplicantsTab'
import { ConnectComposer } from '@/components/inbox/ConnectComposer'
import { PermissionsPanel } from './applicants/PermissionsPanel'

import {
  PROJECT_TAB_ICONS, ProjectTabId,
} from './icons/ProjectTabIcons'

import {
  DsrtPage, DsrtSkeleton, DsrtLayoutWithRail, DsrtButton, DsrtPanel,
} from '@/components/dsrt'

import { cn } from '@/lib/utils'

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface Props {
  slug: string
}

type LoadState =
  | { status: 'loading' }
  | { status: 'ok'; data: ProjectDetailData }
  | { status: 'not_found' }
  | { status: 'forbidden'; message?: string }
  | { status: 'error'; message: string }

interface ProjectDetailData {
  project: any
  links: any[]
  images: any[]
  team: any[]
  reviews_count: number
  is_owner: boolean
  is_member: boolean
  is_following: boolean
  is_saved: boolean
}

interface TabDef {
  id: ProjectTabId
  label: string
  badge?: number
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function ProjectDetailPage({ slug }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClient(), [])

  // ─── Auth ──────────────────────────────────────────────────────
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [authChecked, setAuthChecked] = useState(false)

  // ─── Main data ────────────────────────────────────────────────
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' })
  const activeRequestId = useRef(0)
  const isMountedRef = useRef(true)
  const [images, setImages] = useState<any[]>([])

  // ─── Tabs ──────────────────────────────────────────────────────
  const initialTab = ((): ProjectTabId => {
    const t = searchParams?.get('tab') as ProjectTabId | null
    const valid: ProjectTabId[] = [
      'overview', 'updates', 'team', 'reviews',
      'documentation', 'applicants', 'settings',
    ]
    return t && valid.includes(t) ? t : 'overview'
  })()
  const [activeTab, setActiveTab] = useState<ProjectTabId>(initialTab)

  // ─── Applicants meta ──────────────────────────────────────────
  const [pendingAppCount, setPendingAppCount] = useState(0)
  const [canViewApplicants, setCanViewApplicants] = useState(false)

  // ─── Modals ────────────────────────────────────────────────────
  const [addMemberOpen, setAddMemberOpen] = useState(false)
  const [connectOpen, setConnectOpen] = useState(false)
  const [glanceField, setGlanceField] = useState<string | null>(null)

  // ─── Update composer (hoisted so both Preview + full Feed can open it) ─
  const [composerOpen, setComposerOpen] = useState(false)
  // Bumping this key forces the ProjectUpdates feed to refetch after a new post
  const [updatesRefreshKey, setUpdatesRefreshKey] = useState(0)

  // ─── Completion banner ────────────────────────────────────────
  const [showCompletion, setShowCompletion] = useState(true)

  // ═════════════════════════════════════════════════════════════════════
  // LIFECYCLE
  // ═════════════════════════════════════════════════════════════════════
  useEffect(() => {
    isMountedRef.current = true
    return () => { isMountedRef.current = false }
  }, [])

  useEffect(() => {
    let cancelled = false
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled || !isMountedRef.current) return
      setCurrentUserId(data.user?.id || null)
      setAuthChecked(true)
    })
    return () => { cancelled = true }
  }, [supabase])

  // ═════════════════════════════════════════════════════════════════════
  // MAIN FETCH
  // ═════════════════════════════════════════════════════════════════════
  const fetchDetail = useCallback(async () => {
    activeRequestId.current += 1
    const requestId = activeRequestId.current

    if (isMountedRef.current) setLoadState({ status: 'loading' })

    try {
      const res = await fetch(`/api/projects/${slug}`, {
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
      })

      if (requestId !== activeRequestId.current || !isMountedRef.current) return

      if (res.status === 404) {
        setLoadState({ status: 'not_found' })
        return
      }

      const json = await res.json().catch(() => ({}))

      if (json?.error === 'This project is private' || json?.code === 'forbidden' || res.status === 403) {
        setLoadState({ status: 'forbidden', message: json?.error })
        return
      }

      if (json?.error === 'Project not found' || json?.code === 'not_found') {
        setLoadState({ status: 'not_found' })
        return
      }

      if (!res.ok) {
        setLoadState({ status: 'error', message: json?.error || `Server returned ${res.status}` })
        return
      }

      if (!json?.project) {
        setLoadState({ status: 'not_found' })
        return
      }

      const data: ProjectDetailData = {
        project: json.project,
        links: Array.isArray(json.links) ? json.links : [],
        images: Array.isArray(json.images) ? json.images : [],
        team: Array.isArray(json.team) ? json.team : [],
        reviews_count: Number(json.reviews_count) || 0,
        is_owner: !!json.is_owner,
        is_member: !!json.is_member,
        is_following: !!json.is_following,
        is_saved: !!json.is_saved,
      }

      setLoadState({ status: 'ok', data })
      setImages(data.images)

      if (data.project.completion_dismissed) {
        setShowCompletion(false)
      }
    } catch (e: any) {
      if (requestId !== activeRequestId.current || !isMountedRef.current) return
      setLoadState({
        status: 'error',
        message: e?.message || 'Network error — please check your connection',
      })
    }
  }, [slug])

  useEffect(() => {
    if (!authChecked) return
    fetchDetail()
  }, [authChecked, fetchDetail])

  // ═════════════════════════════════════════════════════════════════════
  // APPLICANTS COUNT POLL
  // ═════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (loadState.status !== 'ok') return
    let cancelled = false

    const fetchCount = async () => {
      try {
        const res = await fetch(`/api/projects/${slug}/applicants/count`)
        if (cancelled || !isMountedRef.current) return
        if (!res.ok) {
          setCanViewApplicants(false)
          return
        }
        const j = await res.json()
        setPendingAppCount(j.count || 0)
        setCanViewApplicants(typeof j.count === 'number')
      } catch {
        if (!cancelled) setCanViewApplicants(false)
      }
    }

    fetchCount()
    const interval = setInterval(fetchCount, 45000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [slug, loadState.status])

  // ═════════════════════════════════════════════════════════════════════
  // ACTIONS
  // ═════════════════════════════════════════════════════════════════════

  const patchProject = useCallback(async (patch: Record<string, any>) => {
    if (loadState.status !== 'ok') return
    const prev = loadState.data

    setLoadState({
      status: 'ok',
      data: { ...prev, project: { ...prev.project, ...patch } },
    })

    try {
      const res = await fetch(`/api/projects/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Update failed')

      if (isMountedRef.current) {
        setLoadState({
          status: 'ok',
          data: { ...prev, project: { ...prev.project, ...json.project } },
        })
      }
    } catch (e: any) {
      if (isMountedRef.current) setLoadState({ status: 'ok', data: prev })
      toast.error(e?.message || 'Update failed')
      throw e
    }
  }, [slug, loadState])

  const uploadMedia = useCallback(async (
    file: File,
    kind: 'logo' | 'cover' | 'gallery' | 'update'
  ): Promise<string | null> => {
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('kind', kind)
      const res = await fetch(`/api/projects/${slug}/media-upload`, {
        method: 'POST',
        body: fd,
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Upload failed')
      return json.url
    } catch (e: any) {
      toast.error(e?.message || 'Upload failed')
      return null
    }
  }, [slug])

  const toggleFollow = useCallback(async () => {
    if (loadState.status !== 'ok') return
    const prev = loadState.data
    const wasFollowing = prev.is_following

    setLoadState({
      status: 'ok',
      data: {
        ...prev,
        is_following: !wasFollowing,
        project: {
          ...prev.project,
          follower_count: (prev.project.follower_count || 0) + (wasFollowing ? -1 : 1),
        },
      },
    })

    try {
      const res = await fetch(`/api/projects/${slug}/follow`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed')

      if (isMountedRef.current) {
        setLoadState((cur) => {
          if (cur.status !== 'ok') return cur
          return {
            status: 'ok',
            data: {
              ...cur.data,
              is_following: !!json.following,
              project: {
                ...cur.data.project,
                follower_count: (prev.project.follower_count || 0)
                  + (json.following ? 1 : 0)
                  - (wasFollowing ? 1 : 0),
              },
            },
          }
        })
      }
    } catch (e: any) {
      if (isMountedRef.current) setLoadState({ status: 'ok', data: prev })
      toast.error(e?.message || 'Could not update follow status')
    }
  }, [slug, loadState])

  const addLink = useCallback(async (type: string, url: string, label?: string) => {
    const res = await fetch(`/api/projects/${slug}/links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, url, label }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json?.error || 'Failed to add link')

    if (isMountedRef.current && loadState.status === 'ok') {
      setLoadState({
        status: 'ok',
        data: { ...loadState.data, links: [...loadState.data.links, json.link] },
      })
    }
  }, [slug, loadState])

  const deleteLink = useCallback(async (id: string) => {
    if (loadState.status !== 'ok') return
    const prev = loadState.data

    setLoadState({
      status: 'ok',
      data: { ...prev, links: prev.links.filter(l => l.id !== id) },
    })

    try {
      const res = await fetch(`/api/projects/${slug}/links?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
    } catch (e: any) {
      if (isMountedRef.current) setLoadState({ status: 'ok', data: prev })
      toast.error(e?.message || 'Could not remove link')
    }
  }, [slug, loadState])

  const saveAbout = useCallback(async (content: string) => {
    await patchProject({ about_content: content })
  }, [patchProject])

  const addImage = useCallback(async (url: string, type: string) => {
    try {
      const res = await fetch(`/api/projects/${slug}/images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, type }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed')
      if (isMountedRef.current) setImages(prev => [...prev, json.image])
    } catch (e: any) {
      toast.error(e?.message || 'Could not add image')
    }
  }, [slug])

  const deleteImage = useCallback(async (id: string) => {
    const prev = images
    setImages(prev.filter(i => i.id !== id))
    try {
      await fetch(`/api/projects/${slug}/images?id=${id}`, { method: 'DELETE' })
    } catch {
      if (isMountedRef.current) setImages(prev)
      toast.error('Could not delete image')
    }
  }, [slug, images])

  const dismissCompletion = useCallback(async () => {
    setShowCompletion(false)
    try {
      await patchProject({ completion_dismissed: true })
    } catch {}
  }, [patchProject])

  const archiveProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${slug}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to archive')
      toast.success('Project archived')
      router.push('/projects')
    } catch (e: any) {
      toast.error(e?.message || 'Could not archive project')
    }
  }, [slug, router])

  const handleTabChange = useCallback((next: ProjectTabId) => {
    setActiveTab(next)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      params.set('tab', next)
      window.history.replaceState(null, '', `?${params.toString()}`)
    }
  }, [])

  // Composer callbacks — shared across Preview and full Feed
  const openComposer = useCallback(() => setComposerOpen(true), [])
  const closeComposer = useCallback(() => setComposerOpen(false), [])
  const handleUpdatePosted = useCallback(() => {
    // Bump the refresh key so any mounted feed refetches
    setUpdatesRefreshKey(k => k + 1)
    setComposerOpen(false)
  }, [])
  const switchToUpdatesTab = useCallback(() => {
    handleTabChange('updates')
    // Scroll to top of updates tab for good UX
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 50)
  }, [handleTabChange])

  // ═════════════════════════════════════════════════════════════════════
  // RENDER: STATE PANELS
  // ═════════════════════════════════════════════════════════════════════

  if (loadState.status === 'loading') {
    return (
      <DsrtPage width="wide" className="space-y-5">
        <DsrtSkeleton className="h-8 w-32 rounded" />
        <DsrtSkeleton className="h-[280px] w-full rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
          <div className="space-y-4">
            <DsrtSkeleton className="h-14 w-full rounded" />
            <DsrtSkeleton className="h-[500px] w-full rounded-2xl" />
          </div>
          <div className="space-y-3">
            <DsrtSkeleton className="h-[260px] w-full rounded-2xl" />
            <DsrtSkeleton className="h-[200px] w-full rounded-2xl" />
            <DsrtSkeleton className="h-[180px] w-full rounded-2xl" />
          </div>
        </div>
      </DsrtPage>
    )
  }

  if (loadState.status === 'not_found') {
    return (
      <DsrtPage width="default">
        <StatusPanel
          icon={<MagnifyingGlass size={28} className="text-white/50" />}
          title="Project not found"
          description="This project may have been removed, renamed, or you may have followed an outdated link."
          actions={
            <>
              <DsrtButton variant="outline" onClick={() => router.push('/projects')}>
                <House size={13} /> All projects
              </DsrtButton>
              <DsrtButton variant="primary" onClick={() => router.push('/projects?tab=explore')}>
                <MagnifyingGlass size={13} /> Explore projects
              </DsrtButton>
            </>
          }
        />
      </DsrtPage>
    )
  }

  if (loadState.status === 'forbidden') {
    return (
      <DsrtPage width="default">
        <StatusPanel
          icon={<LockKey size={28} className="text-white/50" weight="duotone" />}
          title="This project is private"
          description={
            currentUserId
              ? "You need to be a team member or the owner to view this project."
              : "Sign in to check if you have access to this project."
          }
          actions={
            <>
              <DsrtButton variant="outline" onClick={() => router.push('/projects')}>
                <House size={13} /> All projects
              </DsrtButton>
              {!currentUserId && (
                <DsrtButton variant="primary" onClick={() => router.push(`/login?redirect=/projects/${slug}`)}>
                  Sign in
                </DsrtButton>
              )}
            </>
          }
        />
      </DsrtPage>
    )
  }

  if (loadState.status === 'error') {
    return (
      <DsrtPage width="default">
        <StatusPanel
          icon={<WarningCircle size={28} className="text-red-300" weight="duotone" />}
          title="Something went wrong"
          description={loadState.message}
          actions={
            <>
              <DsrtButton variant="outline" onClick={() => router.push('/projects')}>
                <House size={13} /> All projects
              </DsrtButton>
              <DsrtButton variant="primary" onClick={() => fetchDetail()}>
                <ArrowClockwise size={13} /> Try again
              </DsrtButton>
            </>
          }
        />
      </DsrtPage>
    )
  }

  // ═════════════════════════════════════════════════════════════════════
  // RENDER: OK
  // ═════════════════════════════════════════════════════════════════════
  const { project, team, links, is_owner: isOwner, is_following, is_member } = loadState.data

  const completionSuggestions: string[] = []
  if (!project.logo_url)                                completionSuggestions.push('Add logo')
  if (!project.cover_image_url)                         completionSuggestions.push('Add cover')
  if (!project.short_description)                       completionSuggestions.push('Add description')
  if (!project.about_content || project.about_content.length < 50) completionSuggestions.push('Write About')
  if (!project.industry)                                completionSuggestions.push('Set industry')
  if (links.length === 0)                               completionSuggestions.push('Add links')
  if (team.length === 0)                                completionSuggestions.push('Add team')

  const tabs: TabDef[] = [
    { id: 'overview',      label: 'Overview' },
    { id: 'updates',       label: 'Updates' },
    { id: 'team',          label: 'Team' },
    { id: 'reviews',       label: 'Reviews', badge: loadState.data.reviews_count || undefined },
    { id: 'documentation', label: 'Docs' },
  ]
  if (canViewApplicants || isOwner) {
    tabs.push({
      id: 'applicants',
      label: 'Applicants',
      badge: pendingAppCount > 0 ? pendingAppCount : undefined,
    })
  }
  if (isOwner) {
    tabs.push({ id: 'settings', label: 'Settings' })
  }

  const isMemberOrOwner = isOwner || is_member

  return (
    <DsrtPage width="wide" className="space-y-4 sm:space-y-5">
      {/* Completion banner (owner only) */}
      {isOwner && showCompletion && (project.completion_percent || 0) < 100 && (
        <ProjectCompletion
          percent={project.completion_percent || 0}
          onDismiss={dismissCompletion}
          suggestions={completionSuggestions}
        />
      )}

      {/* Header */}
      <ProjectHeader
        project={project}
        isOwner={isOwner}
        isFollowing={is_following}
        onFollowToggle={toggleFollow}
        onCollaborate={() => setConnectOpen(true)}
        onUpdate={patchProject}
        onUploadMedia={uploadMedia}
      />

      {/* ⚠️ OpportunitiesSection removed — do NOT re-add */}

      {/* Body: sidebar + main content */}
      <DsrtLayoutWithRail
        railBreakpoint="lg"
        rail={
          <ProjectSidebar
            project={project}
            team={team}
            links={links}
            isOwner={isOwner}
            onAddMember={() => setAddMemberOpen(true)}
            onAddLink={addLink}
            onDeleteLink={deleteLink}
            onEditGlance={(field) => setGlanceField(field)}
          />
        }
      >
        <div className="space-y-5">
          {/* Custom DSRT tab bar */}
          <TabBar
            tabs={tabs}
            activeId={activeTab}
            onChange={handleTabChange}
          />

          {/* Tab panels */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <ProjectAbout
                slug={slug}
                aboutContent={project.about_content}
                images={images}
                isOwner={isOwner}
                onSaveAbout={saveAbout}
                onAddImage={addImage}
                onDeleteImage={deleteImage}
                onUploadFile={(file, kind) => uploadMedia(file, kind)}
              />
              {/* Preview strip — compact horizontal cards linking to the book reader */}
              <ProjectUpdatesPreview
                key={`preview-${updatesRefreshKey}`}
                slug={slug}
                projectId={project.id}
                isOwner={isOwner}
                isMember={isMemberOrOwner}
                currentUserId={currentUserId}
                onOpenComposer={isMemberOrOwner ? openComposer : undefined}
                onSwitchToUpdatesTab={switchToUpdatesTab}
              />
            </div>
          )}

          {activeTab === 'updates' && (
            <ProjectUpdates
              key={`feed-${updatesRefreshKey}`}
              slug={slug}
              projectId={project.id}
              projectStage={project.stage || 'idea'}
              isOwner={isOwner}
              isMember={isMemberOrOwner}
              currentUserId={currentUserId}
              onUploadFile={(file, kind) => uploadMedia(file, kind)}
            />
          )}

          {activeTab === 'team' && (
            <TeamStructureTab
              slug={slug}
              projectId={project.id}
              isOwner={isOwner}
              currentUserId={currentUserId}
            />
          )}

          {activeTab === 'reviews' && (
            <ProjectReviews
              slug={slug}
              projectId={project.id}
              currentUserId={currentUserId}
              isOwner={isOwner}
              isPublic={!!project.is_public}
            />
          )}

          {activeTab === 'documentation' && (
            <ProjectDocumentation
              slug={slug}
              project={project}
              isOwner={isOwner}
            />
          )}

          {activeTab === 'applicants' && (canViewApplicants || isOwner) && (
            <ApplicantsTab slug={slug} isOwner={isOwner} />
          )}

          {activeTab === 'settings' && isOwner && (
            <div className="space-y-4">
              <ProjectSettings
                slug={slug}
                project={project}
                onUpdate={patchProject}
                onArchive={archiveProject}
              />
              <PermissionsPanel slug={slug} />
            </div>
          )}
        </div>
      </DsrtLayoutWithRail>

      {/* ═════════════════════════════════════════════════════════════════
          GLOBAL LINKS FOOTER — renders below every tab, per spec.
          Handles both URL-only links and real file uploads.
          ═════════════════════════════════════════════════════════════════ */}
      <ProjectLinksFooter
        slug={slug}
        projectId={project.id}
        links={links}
        isOwner={isOwner}
        onAddLink={addLink}
        onDeleteLink={deleteLink}
      />

      {/* Update Composer (shared across Preview + Feed) */}
      {composerOpen && (
        <ProjectUpdateComposer
          slug={slug}
          currentStage={project.stage || 'idea'}
          onClose={closeComposer}
          onPosted={handleUpdatePosted}
          onUploadImage={(file, kind) => uploadMedia(file, kind)}
        />
      )}

      {/* Other Modals */}
      {addMemberOpen && (
        <AddMemberModal
          slug={slug}
          onClose={() => setAddMemberOpen(false)}
          onAdded={() => { setAddMemberOpen(false); fetchDetail() }}
        />
      )}

      {glanceField && (
        <GlanceEditModal
          field={glanceField}
          currentValue={project[glanceField]}
          onClose={() => setGlanceField(null)}
          onSave={patchProject}
        />
      )}

      {connectOpen && (
        <ConnectComposer
          referenceType="project"
          referenceId={project.id}
          referenceName={project.name}
          referenceSlug={project.slug}
          onClose={() => setConnectOpen(false)}
          onSent={() => setConnectOpen(false)}
        />
      )}
    </DsrtPage>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// CUSTOM DSRT TAB BAR
// Icons above labels, unique DSRT geometry, sticky under app nav.
// ═══════════════════════════════════════════════════════════════════════════

function TabBar({
  tabs, activeId, onChange,
}: {
  tabs: TabDef[]
  activeId: ProjectTabId
  onChange: (id: ProjectTabId) => void
}) {
  return (
    <div className="sticky top-[var(--dsrt-nav-h)] z-20 bg-[#05070D]/95 backdrop-blur-md -mx-4 px-4 sm:mx-0 sm:px-0 border-b border-white/[0.08]">
      <div
        role="tablist"
        aria-label="Project sections"
        className="flex gap-1 sm:gap-3 -mb-px overflow-x-auto scrollbar-hide"
      >
        {tabs.map(tab => {
          const Icon = PROJECT_TAB_ICONS[tab.id]
          const active = activeId === tab.id
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={active}
              onClick={() => onChange(tab.id)}
              className={cn(
                'group relative flex flex-col items-center gap-1.5 pt-2 pb-3 min-w-[74px] sm:min-w-[86px] transition-all outline-none',
                'border-b-[3px]',
                active ? 'border-[#38bdf8]' : 'border-transparent hover:border-white/15'
              )}
            >
              <div
                className={cn(
                  'w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center transition-all duration-200',
                  active
                    ? 'bg-gradient-to-br from-[#38bdf8]/18 to-[#2563eb]/10 border border-[#38bdf8]/30 shadow-[0_0_18px_rgba(56,189,248,0.12)]'
                    : 'bg-white/[0.03] border border-white/[0.06] group-hover:bg-white/[0.05] group-hover:border-white/[0.1]'
                )}
              >
                <Icon
                  className={cn(
                    'w-5 h-5 sm:w-[22px] sm:h-[22px] transition-colors',
                    active ? 'text-[#38bdf8]' : 'text-white/45 group-hover:text-white/80'
                  )}
                />
              </div>
              <span className="flex items-center gap-1 whitespace-nowrap">
                <span
                  className={cn(
                    'text-[11.5px] sm:text-[12.5px] transition-colors',
                    active ? 'text-white font-bold tracking-wide' : 'text-white/50 group-hover:text-white/85 font-semibold'
                  )}
                >
                  {tab.label}
                </span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span
                    className={cn(
                      'text-[9.5px] font-mono font-bold px-1.5 min-w-[16px] h-[16px] flex items-center justify-center rounded-full transition-colors',
                      active
                        ? 'bg-[#38bdf8]/20 text-[#7dd3fc] border border-[#38bdf8]/30'
                        : 'bg-white/[0.06] text-white/60 border border-white/[0.08]'
                    )}
                  >
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// STATUS PANEL
// ═══════════════════════════════════════════════════════════════════════════

function StatusPanel({
  icon, title, description, actions,
}: {
  icon: React.ReactNode
  title: string
  description?: string
  actions?: React.ReactNode
}) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center py-16">
      <DsrtPanel padding="lg" variant="default" className="max-w-md w-full text-center">
        <div className="mx-auto w-14 h-14 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-4">
          {icon}
        </div>
        <h1 className="text-[18px] font-semibold text-white mb-1.5">{title}</h1>
        {description && (
          <p className="text-[13.5px] text-white/55 leading-relaxed mb-6 max-w-sm mx-auto">
            {description}
          </p>
        )}
        {actions && (
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {actions}
          </div>
        )}
      </DsrtPanel>
    </div>
  )
}