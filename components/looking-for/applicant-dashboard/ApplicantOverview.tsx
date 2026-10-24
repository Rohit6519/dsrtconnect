'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  FileText,
  ChatCircle,
  Handshake,
  WarningCircle,
  CheckCircle,
} from '@phosphor-icons/react'
import { ApplicationList } from './ApplicationList'
import { DsrtPanel, DsrtGrid, DsrtSkeleton, DsrtEmpty } from '@/components/dsrt'
import { cn } from '@/lib/utils'

const ATTENTION_STAGES = new Set(['offered', 'interviewing', 'offer', 'interview'])

export function ApplicantOverview() {
  const sp = useSearchParams()
  const filter = sp.get('filter') || 'all'
  const search = sp.get('search') || ''
  const sort = sp.get('sort') || 'recent_activity'

  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const mountedRef = useRef(true)
  const inflightRef = useRef<AbortController | null>(null)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      inflightRef.current?.abort()
    }
  }, [])

  const load = useCallback(
    async (cursor?: string) => {
      inflightRef.current?.abort()
      const ac = new AbortController()
      inflightRef.current = ac

      if (cursor) setLoadingMore(true)
      else setLoading(true)

      try {
        const p = new URLSearchParams()
        if (filter !== 'all') p.set('filter', filter)
        if (search) p.set('search', search)
        if (sort !== 'recent_activity') p.set('sort', sort)
        if (cursor) p.set('cursor', cursor)

        const res = await fetch(`/api/opportunities/my-applications?${p.toString()}`, {
          signal: ac.signal,
          cache: 'no-store',
        })
        const d = await res.json()

        if (!mountedRef.current) return

        if (cursor && data) {
          setData({
            ...d,
            applications: [...data.applications, ...(d.applications || [])],
          })
        } else {
          setData(d)
        }
      } catch (e: any) {
        if (e?.name !== 'AbortError') console.error(e)
      } finally {
        if (mountedRef.current) {
          setLoading(false)
          setLoadingMore(false)
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filter, search, sort]
  )

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') load()
    }
    const onFocus = () => load()
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('focus', onFocus)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('focus', onFocus)
    }
  }, [load])

  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') load()
    }, 30000)
    return () => clearInterval(t)
  }, [load])

  if (loading) {
    return (
      <div className="space-y-6">
        <DsrtGrid cols={{ base: 2, md: 4 }} gap="md">
          {[0, 1, 2, 3].map((i) => (
            <DsrtSkeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </DsrtGrid>
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <DsrtSkeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <DsrtEmpty
        title="Failed to load dashboard"
        description="Please refresh and try again."
      />
    )
  }

  const stats = data.stats || {}
  const apps = data.applications || []
  const attentionItems = apps.filter(
    (a: any) => a.unread_messages > 0 || ATTENTION_STAGES.has(a.pipeline_stage)
  )

  return (
    <div className="space-y-6 sm:space-y-8">
      {filter === 'all' && (
        <DsrtGrid cols={{ base: 2, md: 4 }} gap="md">
          <StatCard label="Active" value={stats.active} icon={FileText} />
          <StatCard label="Shortlisted" value={stats.shortlisted} icon={CheckCircle} tone="accent" />
          <StatCard label="Interviews" value={stats.interviews} icon={ChatCircle} tone="info" />
          <StatCard label="Offers" value={stats.offers} icon={Handshake} tone="warning" />
        </DsrtGrid>
      )}

      {filter === 'all' && attentionItems.length > 0 && (
        <DsrtPanel padding="none" variant="default" className="overflow-hidden border-[#2c5282]/40">
          <div className="px-4 sm:px-5 py-3 border-b border-[#2c5282]/25 bg-[#1e3a5f]/20">
            <h3 className="text-[12px] font-semibold text-[#93c5fd] flex items-center gap-2">
              <WarningCircle size={15} weight="fill" /> Action Required
            </h3>
          </div>
          <div className="divide-y divide-white/[0.04] p-2">
            {attentionItems.map((a: any) => (
              <a
                key={a.id}
                href={`/looking-for/my-applications/${a.id}`}
                className="flex items-center justify-between gap-3 p-3 hover:bg-white/[0.03] rounded-xl transition-colors group"
              >
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold text-white group-hover:text-[#93c5fd] truncate">
                    {a.opportunity?.title}
                  </div>
                  <div className="text-[11.5px] text-white/45 mt-0.5">
                    {a.unread_messages > 0
                      ? `${a.unread_messages} unread message(s)`
                      : `Stage: ${a.pipeline_stage}`}
                  </div>
                </div>
                <div className="text-[11px] font-semibold text-white/50 bg-white/[0.04] px-3 py-1.5 rounded-lg border border-white/[0.08] group-hover:bg-white/[0.08] group-hover:text-white shrink-0">
                  View →
                </div>
              </a>
            ))}
          </div>
        </DsrtPanel>
      )}

      <ApplicationList
        applications={apps}
        filter={filter}
        hasMore={!!data.has_more}
        loadingMore={loadingMore}
        onLoadMore={() => data.next_cursor && load(data.next_cursor)}
      />
    </div>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string
  value: number
  icon: any
  tone?: 'accent' | 'info' | 'warning'
}) {
  const valueClass =
    tone === 'accent'
      ? 'text-[#93c5fd]'
      : tone === 'info'
      ? 'text-sky-300'
      : tone === 'warning'
      ? 'text-amber-300'
      : 'text-white'

  return (
    <DsrtPanel variant="default" padding="md">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-white/40">
          {label}
        </span>
        <Icon size={14} className="text-white/30" />
      </div>
      <div className={cn('text-[24px] sm:text-[26px] font-bold tracking-tight', valueClass)}>
        {value || 0}
      </div>
    </DsrtPanel>
  )
}