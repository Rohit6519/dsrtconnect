'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Warning, BookmarkSimple, Share, Flag,
  PencilSimple, CheckCircle,
} from '@phosphor-icons/react'
import { PublicOpportunityRender } from '../public/PublicOpportunityRender'
import { PublicPosterRender, type PosterData, type PosterSkill, type PosterProject, type PosterVenture } from '../public/PublicPosterRender'
import { ApplyModal } from './ApplyModal'
import { ShareModal } from './ShareModal'
import { ReportModal } from './ReportModal'
import type { TeamUpItem } from '@/types/teamup'

interface Props {
  id: string
  source: string
}

type Tab = 'opportunity' | 'about'

export function RequestDetailPage({ id, source }: Props) {
  const router = useRouter()
  const [data, setData] = useState<TeamUpItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('opportunity')

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const [poster, setPoster] = useState<PosterData | null>(null)
  const [posterSkills, setPosterSkills] = useState<PosterSkill[]>([])
  const [posterProjects, setPosterProjects] = useState<PosterProject[]>([])
  const [posterVentures, setPosterVentures] = useState<PosterVenture[]>([])

  const [showApply, setShowApply] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/looking-for/${id}?source=${source}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Not found')
      }
      const item = await res.json()
      setData(item)
    } catch (e: any) {
      setError(e.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [id, source])

  const loadPoster = useCallback(async () => {
    try {
      const res = await fetch(`/api/looking-for/${id}/poster?source=${source}`)
      const p = await res.json().catch(() => ({}))
      if (p.poster) {
        setPoster(p.poster)
        setPosterSkills(p.skills || [])
        setPosterProjects(p.projects || [])
        setPosterVentures(p.ventures || [])
      }
    } catch { /* ignore */ }
  }, [id, source])

  useEffect(() => {
    load()
    loadPoster()
  }, [load, loadPoster])

  // Load current user id (to detect owner + enable edit)
  useEffect(() => {
    let cancelled = false
    fetch('/api/looking-for/sidebar-me').then(r => r.json()).then(d => {
      if (!cancelled) setCurrentUserId(d?.user?.id || null)
    }).catch(() => null)
    return () => { cancelled = true }
  }, [])

  // Track view
  useEffect(() => {
    if (!data) return
    const enter = Date.now()
    const sessionId = typeof window !== 'undefined'
      ? (sessionStorage.getItem('dsrt_sid') || (() => {
          const s = Math.random().toString(36).slice(2)
          sessionStorage.setItem('dsrt_sid', s)
          return s
        })())
      : undefined

    fetch(`/api/looking-for/${id}/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_type: source,
        session_id: sessionId,
        source: 'direct',
        referrer_url: typeof document !== 'undefined' ? document.referrer : null,
      }),
    }).catch(() => null)

    return () => {
      const dwell = Date.now() - enter
      if (dwell > 2000) {
        navigator.sendBeacon?.(
          `/api/looking-for/${id}/view`,
          new Blob([JSON.stringify({ source_type: source, session_id: sessionId, dwell_ms: dwell })], { type: 'application/json' })
        )
      }
    }
  }, [data, id, source])

  const handleSave = async () => {
    if (!data || saving) return
    setSaving(true)
    const newSaved = !data.is_saved
    setData(d => d ? { ...d, is_saved: newSaved } : d)
    try {
      await fetch(
        `/api/looking-for/${id}/save${newSaved ? '' : `?source=${source}`}`,
        {
          method: newSaved ? 'POST' : 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: newSaved ? JSON.stringify({ source_type: source }) : undefined,
        }
      )
    } catch {
      setData(d => d ? { ...d, is_saved: !newSaved } : d)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return null

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-zinc-100">
        <div className="max-w-xl mx-auto px-6 py-24 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-lg border border-zinc-800 bg-zinc-950 flex items-center justify-center text-zinc-500">
            <Warning size={20} />
          </div>
          <h1 className="text-[18px] font-semibold text-zinc-100 mb-1.5">
            {error === 'Not found' ? 'Opportunity not found' : 'Something went wrong'}
          </h1>
          <p className="text-[13px] text-zinc-500 mb-5">{error}</p>
          <Link
            href="/looking-for"
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md border border-zinc-800 hover:border-zinc-600 text-[13px] text-zinc-300"
          >
            <ArrowLeft size={13} weight="bold" />
            Back to Team Up
          </Link>
        </div>
      </div>
    )
  }

  const isOwner = currentUserId && data.owner_id === currentUserId
  const isClosed =
    data.status === 'closed' ||
    data.status === 'filled' ||
    data.status === 'archived' ||
    (data.application_deadline && new Date(data.application_deadline) < new Date())

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 flex flex-col">
      {/* Sticky header */}
      <header className="sticky top-0 z-30 bg-[#0a0a0a]/95 backdrop-blur border-b border-zinc-800">
        <div className="max-w-[1200px] mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 text-[12.5px] text-zinc-500 hover:text-zinc-300"
          >
            <ArrowLeft size={12} />
            Back
          </button>

          <div className="flex items-center gap-2 shrink-0">
            <IconAction Icon={BookmarkSimple} label={data.is_saved ? 'Saved' : 'Save'} onClick={handleSave} active={!!data.is_saved} />
            <IconAction Icon={Share} label="Share" onClick={() => setShowShare(true)} />
            <IconAction Icon={Flag} label="Report" onClick={() => setShowReport(true)} />
            {isOwner && (
              <Link
                href={`/looking-for/my-hirings/${id}?source=${source}`}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-zinc-800 hover:border-zinc-600 text-[12.5px] text-zinc-200"
              >
                <PencilSimple size={12} weight="regular" />
                Manage
              </Link>
            )}
            {!isOwner && (
              data.has_applied ? (
                <span className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-emerald-500/30 bg-emerald-500/5 text-emerald-400 text-[12.5px] font-medium">
                  <CheckCircle size={12} weight="fill" />
                  Applied
                </span>
              ) : isClosed ? (
                <button disabled className="h-8 px-3 rounded-md bg-zinc-900 text-zinc-500 text-[12.5px] font-medium cursor-not-allowed">
                  Applications closed
                </button>
              ) : (
                <button
                  onClick={() => setShowApply(true)}
                  className="inline-flex items-center h-8 px-4 rounded-md bg-white text-black hover:bg-zinc-200 text-[12.5px] font-semibold transition-colors"
                >
                  Apply
                </button>
              )
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="flex items-center gap-6">
            <TabButton active={tab === 'opportunity'} onClick={() => setTab('opportunity')}>
              Opportunity
            </TabButton>
            <TabButton active={tab === 'about'} onClick={() => setTab('about')}>
              About the Poster
            </TabButton>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1200px] mx-auto px-6 py-8">
          {tab === 'opportunity' ? (
            <PublicOpportunityRender item={data as any} mode="desktop" />
          ) : poster ? (
            <PublicPosterRender
              poster={poster}
              skills={posterSkills}
              projects={posterProjects}
              ventures={posterVentures}
            />
          ) : (
            <div className="text-[13px] text-zinc-500 text-center py-10">Loading poster...</div>
          )}
        </div>
      </main>

      {showApply && (
        <ApplyModal
          item={data}
          onClose={() => setShowApply(false)}
          onSuccess={() => {
            setShowApply(false)
            setData(d => d ? { ...d, has_applied: true } : d)
          }}
        />
      )}
      {showShare && <ShareModal item={data} onClose={() => setShowShare(false)} />}
      {showReport && <ReportModal item={data} onClose={() => setShowReport(false)} />}
    </div>
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

function IconAction({
  Icon, label, onClick, active,
}: {
  Icon: any
  label: string
  onClick: () => void
  active?: boolean
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={
        'inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border text-[12px] font-medium transition-colors ' +
        (active
          ? 'border-blue-500/40 bg-blue-500/10 text-blue-400'
          : 'border-zinc-800 hover:border-zinc-600 text-zinc-300')
      }
    >
      <Icon size={12} weight={active ? 'fill' : 'regular'} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}
