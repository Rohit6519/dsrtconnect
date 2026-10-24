'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowClockwise, CircleNotch, Warning, Sparkle } from '@phosphor-icons/react'
import { RequestCard } from '../RequestCard'
import { EmptyState } from '../EmptyState'
import { CardSkeletonGrid } from '../CardSkeleton'
import type { TeamUpItem } from '@/types/teamup'
import { REQUEST_TYPE_LABELS } from '@/types/teamup'

const TYPE_CHIPS = [
  { key: 'all', label: 'All' },
  { key: 'hiring', label: 'Hiring' },
  { key: 'jobs', label: 'Jobs' },
  { key: 'cofounder', label: 'Co-founder' },
  { key: 'collaborate', label: 'Collaborate' },
  { key: 'join_project', label: 'Projects' },
  { key: 'join_venture', label: 'Ventures' },
  { key: 'expert_help', label: 'Expertise' },
  { key: 'advisor', label: 'Advisors' },
  { key: 'mentor', label: 'Mentors' },
]

interface Suggestion extends TeamUpItem {
  match_score?: number
  match_reasons?: string[]
}

export function SuggestedTab() {
  const [items, setItems] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState('all')

  const load = useCallback(async (currentFilter: string) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ limit: '30' })
      if (currentFilter !== 'all') params.set('request_type', currentFilter)
      const res = await fetch(`/api/looking-for/recommendations?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to load recommendations')
      const data = await res.json()
      setItems(data.items || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load(filter)
  }, [filter, load])

  const dismiss = async (item: Suggestion) => {
    setItems(prev => prev.filter(i => !(i.source_type === item.source_type && i.source_id === item.source_id)))
    try {
      await fetch(`/api/looking-for/${item.source_id}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_type: item.source_type, collection: 'dismissed' }),
      })
    } catch { /* ignore */ }
  }

  const forceRefresh = async () => {
    setRefreshing(true)
    try {
      await fetch('/api/looking-for/recommendations/refresh', { method: 'POST' })
      await load(filter)
    } catch { /* ignore */ }
    finally { setRefreshing(false) }
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[22px] font-bold text-white tracking-tight">Suggested for you</h2>
            <p className="text-[13px] text-zinc-500 mt-1 leading-relaxed max-w-xl">
              Opportunities picked by the DSRT algorithm based on your skills, interests, network, and activity.
            </p>
          </div>
          <button
            onClick={forceRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md border border-zinc-800 hover:border-zinc-600 text-[13px] font-semibold text-zinc-200 disabled:opacity-40 transition-colors"
          >
            {refreshing ? (
              <>
                <CircleNotch size={12} className="animate-spin" />
                Refreshing
              </>
            ) : (
              <>
                <ArrowClockwise size={12} weight="regular" />
                Refresh
              </>
            )}
          </button>
        </div>
      </div>

      {/* Type filter */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
        {TYPE_CHIPS.map(chip => {
          const active = filter === chip.key
          return (
            <button
              key={chip.key}
              onClick={() => setFilter(chip.key)}
              className={
                'inline-flex items-center h-8 px-3.5 rounded-md text-[12.5px] font-semibold border transition-colors shrink-0 ' +
                (active
                  ? 'bg-white text-black border-white'
                  : 'bg-transparent border-zinc-800 text-zinc-300 hover:border-zinc-600 hover:text-white')
              }
            >
              {chip.label}
            </button>
          )
        })}
      </div>

      {loading ? (
        <CardSkeletonGrid count={6} />
      ) : error ? (
        <EmptyState
          icon={<Warning size={18} weight="regular" />}
          title="Couldn't load recommendations"
          description={error}
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Sparkle size={18} weight="regular" />}
          title="No matches yet"
          description="Add skills and interests to your profile to unlock personalized recommendations."
          action={
            <Link
              href="/settings"
              className="inline-flex items-center h-9 px-3.5 rounded-md bg-white text-black hover:bg-zinc-200 text-[13px] font-bold"
            >
              Update profile
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {items.map(item => (
            <SuggestedCard key={`${item.source_type}-${item.source_id}`} item={item} onDismiss={() => dismiss(item)} />
          ))}
        </div>
      )}
    </div>
  )
}

function SuggestedCard({ item, onDismiss }: { item: Suggestion; onDismiss: () => void }) {
  const [dismissing, setDismissing] = useState(false)

  const handleDismiss = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDismissing(true)
    setTimeout(onDismiss, 150)
  }

  const topReason = item.match_reasons && item.match_reasons.length > 0 ? item.match_reasons[0] : null

  return (
    <div className={
      'relative transition-opacity ' +
      (dismissing ? 'opacity-0' : 'opacity-100')
    }>
      <RequestCard item={item} />

      <div className="mt-1 flex items-center justify-between gap-2 px-1">
        <div className="min-w-0 flex-1 text-[11.5px] text-zinc-500 font-medium truncate">
          {topReason || 'Recommended for you'}
        </div>
        <button
          onClick={handleDismiss}
          className="text-[10.5px] text-zinc-600 hover:text-zinc-300 transition-colors shrink-0 uppercase tracking-wider font-semibold"
        >
          Not interested
        </button>
      </div>
    </div>
  )
}
