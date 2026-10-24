'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Warning } from '@phosphor-icons/react'
import { OpportunityHeader } from './OpportunityHeader'
import { OpportunityBody } from './OpportunityBody'
import { OpportunitySidebar } from './OpportunitySidebar'
import { PosterCard } from './PosterCard'
import { ShareModal } from './ShareModal'
import { ReportModal } from './ReportModal'
import {
  DsrtPage,
  DsrtLayoutWithRail,
  DsrtEmpty,
  DsrtButton,
  DsrtSkeleton,
  DsrtPanel,
  DsrtAvatar,
} from '@/components/dsrt'

interface Props {
  id: string
}

type Tab = 'opportunity' | 'about-poster'

export function OpportunityDetailPage({ id }: Props) {
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('opportunity')
  const [showShare, setShowShare] = useState(false)
  const [showReport, setShowReport] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/opportunities/${id}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Not found')
      }
      const json = await res.json()
      setData(json)
    } catch (e: any) {
      setError(e.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!data?.id) return
    const enter = Date.now()
    const sessionId =
      typeof window !== 'undefined'
        ? sessionStorage.getItem('dsrt_sid') ||
          (() => {
            const s = 'sid_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10)
            sessionStorage.setItem('dsrt_sid', s)
            return s
          })()
        : undefined

    fetch(`/api/opportunities/${data.id}/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        source: 'direct',
        referrer_url: typeof document !== 'undefined' ? document.referrer : null,
        device_type:
          typeof window !== 'undefined' && window.innerWidth < 768 ? 'mobile' : 'desktop',
      }),
    }).catch(() => {})

    return () => {
      const dwell = Date.now() - enter
      if (dwell > 2000 && typeof navigator !== 'undefined' && navigator.sendBeacon) {
        try {
          navigator.sendBeacon(
            `/api/opportunities/${data.id}/view`,
            new Blob([JSON.stringify({ session_id: sessionId, dwell_ms: dwell })], {
              type: 'application/json',
            })
          )
        } catch {}
      }
    }
  }, [data?.id])

  const handleSave = async () => {
    if (!data) return
    const newSaved = !data.is_saved
    setData((d: any) => (d ? { ...d, is_saved: newSaved } : d))
    try {
      if (newSaved) {
        await fetch(`/api/opportunities/${data.id}/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        })
      } else {
        await fetch(`/api/opportunities/${data.id}/save`, { method: 'DELETE' })
      }
    } catch {
      setData((d: any) => (d ? { ...d, is_saved: !newSaved } : d))
    }
  }

  if (loading) {
    return (
      <DsrtPage width="wide">
        <DsrtSkeleton className="h-10 w-40 mb-6" />
        <DsrtSkeleton className="h-8 w-3/4 mb-4" />
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6">
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <DsrtSkeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>
          <div className="space-y-3">
            <DsrtSkeleton className="h-64 w-full rounded-xl" />
            <DsrtSkeleton className="h-48 w-full rounded-xl" />
          </div>
        </div>
      </DsrtPage>
    )
  }

  if (error || !data) {
    return (
      <DsrtPage width="narrow">
        <DsrtEmpty
          icon={Warning}
          title={
            error === 'Not found' || error?.includes('not found')
              ? 'Opportunity not found'
              : 'Something went wrong'
          }
          description={error || undefined}
          action={
            <DsrtButton asChild variant="outline">
              <Link href="/looking-for">
                <ArrowLeft size={13} weight="bold" />
                Back to Looking For
              </Link>
            </DsrtButton>
          }
        />
      </DsrtPage>
    )
  }

  const isOwner = data.is_owner
  const isClosed = data.is_closed
  const hasApplied = data.has_applied

  return (
    <div className="min-h-screen bg-[#05070D] text-white flex flex-col">
      <OpportunityHeader
        opportunity={data}
        tab={tab}
        onTabChange={setTab}
        isOwner={isOwner}
        isClosed={isClosed}
        hasApplied={hasApplied}
        onApply={() => router.push(`/looking-for/${data.id}/apply`)}
        onSave={handleSave}
        onShare={() => setShowShare(true)}
        onReport={() => setShowReport(true)}
        onBack={() => router.back()}
      />

      <main className="flex-1">
        <DsrtPage width="wide" className="py-6">
          {tab === 'opportunity' ? (
            <DsrtLayoutWithRail
              railBreakpoint="lg"
              rail={
                <div className="space-y-4">
                  <OpportunitySidebar
                    opportunity={data}
                    isOwner={isOwner}
                    isClosed={isClosed}
                    hasApplied={hasApplied}
                    onApply={() => router.push(`/looking-for/${data.id}/apply`)}
                  />
                  <PosterCard opportunity={data} />
                </div>
              }
            >
              <OpportunityBody opportunity={data} />
            </DsrtLayoutWithRail>
          ) : (
            <PosterAboutView opportunity={data} />
          )}
        </DsrtPage>
      </main>

      {showShare && <ShareModal opportunity={data} onClose={() => setShowShare(false)} />}
      {showReport && <ReportModal opportunity={data} onClose={() => setShowReport(false)} />}
    </div>
  )
}

function PosterAboutView({ opportunity }: { opportunity: any }) {
  const poster = opportunity.poster
  if (!poster) {
    return (
      <DsrtEmpty title="No poster information" description="Poster details are not available." />
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <DsrtPanel variant="raised" padding="lg">
        <div className="flex items-start gap-4 sm:gap-5 mb-6">
          <DsrtAvatar
            src={poster.avatar_url}
            name={poster.full_name || poster.username}
            size="xl"
          />
          <div className="flex-1 min-w-0">
            <h2 className="text-[20px] sm:text-[22px] font-bold text-white leading-tight tracking-tight">
              {poster.full_name || poster.username}
            </h2>
            {poster.tagline && (
              <p className="text-[13px] text-white/60 mt-1">{poster.tagline}</p>
            )}
            {poster.location && (
              <p className="text-[12px] text-white/40 mt-2 font-mono">{poster.location}</p>
            )}
            <div className="flex items-center gap-3 mt-3 text-[11px] font-mono text-white/40">
              {poster.follower_count > 0 && <span>{poster.follower_count} followers</span>}
              {poster.is_verified && (
                <>
                  <span className="text-white/20">·</span>
                  <span className="text-emerald-300">Verified builder</span>
                </>
              )}
            </div>
          </div>
        </div>

        {poster.bio && (
          <div className="mt-6 pt-6 border-t border-white/[0.06]">
            <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider text-white/40 mb-3">
              About
            </h3>
            <p className="text-[14px] text-white/75 leading-relaxed whitespace-pre-wrap">
              {poster.bio}
            </p>
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-white/[0.06]">
          <DsrtButton asChild variant="white" size="sm">
            <Link href={`/profile/${poster.username}`}>View full profile</Link>
          </DsrtButton>
        </div>
      </DsrtPanel>
    </div>
  )
}