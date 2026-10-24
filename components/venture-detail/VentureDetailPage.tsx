'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Info, Question, Newspaper, BookOpen, Gear, ChartBar, Bell, Package, ChartLineUp
} from '@phosphor-icons/react'

import { VentureHeader } from './VentureHeader'
import { VentureSidebar } from './VentureSidebar'
import { VentureOverview } from './VentureOverview'
import { VentureQuestionsTab } from './questions/VentureQuestionsTab'
import { VentureProducts } from './products/VentureProducts'
import { VentureGrowth } from './growth/VentureGrowth'
import { VentureUpdates } from './updates/VentureUpdates'
import { VentureDocumentsTab } from './documents/VentureDocumentsTab'
import { VentureAnalytics } from './VentureAnalytics'
import { VentureNotificationsTab } from './notifications/VentureNotificationsTab'
import { VentureSettings } from './VentureSettings'
import { ConnectComposer } from '@/components/inbox/ConnectComposer'
import { PostPublishWelcomeModal } from '@/components/venture-assessment/PostPublishWelcomeModal'
import { DsrtPage, DsrtTabs, DsrtSkeleton, DsrtLayoutWithRail } from '@/components/dsrt'

interface Props { slug: string }

const DEPRECATED_TABS = ['funding', 'timeline', 'partners', 'assumptions', 'milestones', 'applicants', 'media', 'roles', 'team']

export function VentureDetailPage({ slug }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<string>('overview')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [connectOpen, setConnectOpen] = useState(false)

  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam) {
      if (DEPRECATED_TABS.includes(tabParam.toLowerCase())) {
        router.replace(`/ventures/${slug}?tab=overview`, { scroll: false })
        setActiveTab('overview')
      } else {
        setActiveTab(tabParam)
      }
    } else {
      setActiveTab('overview')
    }
  }, [searchParams, slug, router])

  const fetchDetail = useCallback(async () => {
    try {
      const res = await fetch('/api/ventures/' + slug)
      if (!res.ok) {
        if (res.status === 404) { router.push('/ventures'); return }
        throw new Error('Failed to load')
      }
      const json = await res.json()
      setData(json)
    } catch (e) {
      console.error('Fetch detail error:', e)
    } finally {
      setLoading(false)
    }
  }, [slug, router])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id || null))
    fetchDetail()
  }, [fetchDetail, supabase])

  useEffect(() => {
    if (!data?.venture?.id) return
    const sessionId = (() => {
      if (typeof window === 'undefined') return 'ssr'
      let sid = sessionStorage.getItem('dsrt_session_id')
      if (!sid) {
        sid = 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10)
        sessionStorage.setItem('dsrt_session_id', sid)
      }
      return sid
    })()

    fetch('/api/ventures/' + slug + '/view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'direct',
        session_id: sessionId,
        referrer_url: typeof document !== 'undefined' ? document.referrer : null,
        device_type: typeof window !== 'undefined' && window.innerWidth < 768 ? 'mobile' : 'desktop',
      }),
    }).catch(() => {})
  }, [data?.venture?.id, slug])

  const patchVenture = async (patch: Record<string, any>) => {
    try {
      const res = await fetch('/api/ventures/' + slug, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!res.ok) throw new Error('Update failed')
      const json = await res.json()
      setData((prev: any) => ({ ...prev, venture: { ...prev.venture, ...json.venture } }))
    } catch (e) {
      console.error('Patch venture error:', e)
    }
  }

  const toggleFollow = async () => {
    try {
      const res = await fetch('/api/ventures/' + slug + '/followers', { method: 'POST' })
      const json = await res.json()
      setData((prev: any) => ({
        ...prev,
        isFollowing: json.following,
        venture: {
          ...prev.venture,
          follower_count: (prev.venture.follower_count || 0) + (json.following ? 1 : -1)
        }
      }))
    } catch (e) { console.error('Toggle follow error:', e) }
  }

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
    router.push(`/ventures/${slug}?tab=${tabId}`, { scroll: false })
  }

  if (loading) {
    return (
      <DsrtPage width="wide">
        <DsrtSkeleton className="h-72 w-full mb-6 rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          <DsrtSkeleton className="h-96 w-full rounded-2xl" />
          <DsrtSkeleton className="h-96 w-full rounded-2xl" />
        </div>
      </DsrtPage>
    )
  }

  if (!data?.venture) {
    return <DsrtPage><p className="text-[14px] text-white/50 text-center py-20">Venture not found.</p></DsrtPage>
  }

  const { venture, products, updates, metrics, founder, isFollowing, isOwner } = data
  const unreadNotifs = venture.unread_notifications || 0

  const headerStats = {
    team: 0,
    followers: venture.follower_count || 0,
    applications: 0,
    openRoles: 0,
  }

  const tabs: { value: string; label: string; badge?: number }[] = [
    { value: 'overview', label: 'Overview' },
    { value: 'questions', label: 'Questions' },
    { value: 'products', label: 'Products', badge: products?.length || 0 },
    { value: 'growth', label: 'Growth' },
    { value: 'updates', label: 'Updates', badge: updates?.length || 0 },
    { value: 'documents', label: 'Documents' },
  ]

  if (isOwner) {
    tabs.push({ value: 'analytics', label: 'Analytics' })
    tabs.push({ value: 'notifications', label: 'Notifications', badge: unreadNotifs })
    tabs.push({ value: 'settings', label: 'Settings' })
  }

  return (
    <DsrtPage width="wide" className="space-y-6">
      <VentureHeader
        venture={venture}
        founder={founder}
        isOwner={isOwner}
        isFollowing={isFollowing}
        onFollowToggle={toggleFollow}
        onUpdate={patchVenture}
        onMessage={() => setConnectOpen(true)}
        onConnect={() => setConnectOpen(true)}
        stats={headerStats}
      />

      <DsrtLayoutWithRail
        railBreakpoint="lg"
        rail={
          <VentureSidebar
            venture={venture}
            founder={founder}
            team={[]}
            products={products || []}
            roles={[]}
            isOwner={isOwner}
            onUpdate={patchVenture}
          />
        }
      >
        <div className="space-y-6">
          {/* UPDATED: sticky top-[116px] md:top-[64px] */}
          <div className="sticky top-[116px] md:top-[64px] z-20 bg-[#05070D]/95 backdrop-blur-md pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
            <DsrtTabs
              variant="underline"
              tabs={tabs}
              activeValue={activeTab}
              onValueChange={handleTabChange}
            />
          </div>

          {activeTab === 'overview' && <VentureOverview venture={venture} isOwner={isOwner} onUpdate={patchVenture} />}
          {activeTab === 'questions' && <VentureQuestionsTab slug={slug} isOwner={isOwner} />}
          {activeTab === 'products' && <VentureProducts venture={venture} products={products || []} slug={slug} isOwner={isOwner} />}
          {activeTab === 'growth' && <VentureGrowth venture={venture} metrics={metrics || []} slug={slug} isOwner={isOwner} />}
          {activeTab === 'updates' && <VentureUpdates venture={venture} updates={updates || []} slug={slug} isOwner={isOwner} currentUserId={currentUserId} />}
          {activeTab === 'documents' && <VentureDocumentsTab slug={slug} isOwner={isOwner} />}
          {activeTab === 'analytics' && isOwner && <VentureAnalytics slug={slug} />}
          {activeTab === 'notifications' && isOwner && <VentureNotificationsTab slug={slug} />}
          {activeTab === 'settings' && isOwner && <VentureSettings venture={venture} slug={slug} onUpdate={patchVenture} />}
        </div>
      </DsrtLayoutWithRail>

      {connectOpen && (
        <ConnectComposer
          referenceType="venture"
          referenceId={venture.id}
          referenceName={venture.name}
          referenceSlug={venture.slug}
          onClose={() => setConnectOpen(false)}
          onSent={() => { fetchDetail() }}
        />
      )}

      {isOwner && (
        <Suspense fallback={null}>
          <PostPublishWelcomeModal slug={slug} ventureName={venture.name} />
        </Suspense>
      )}
    </DsrtPage>
  )
}