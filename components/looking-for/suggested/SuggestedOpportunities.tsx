'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Sparkle, Warning, ArrowRight } from '@phosphor-icons/react'
import { RequestCard } from '../RequestCard'
import { EmptyState } from '../EmptyState'
import { CardSkeletonGrid } from '../CardSkeleton'
import type { TeamUpItem } from '@/types/teamup'

interface Suggestion extends TeamUpItem {
  match_reasons?: string[]
  match_score?: number
}

const TYPE_CHIPS = [
  { key: 'all', label: 'All' },
  { key: 'jobs', label: 'Jobs' },
  { key: 'hiring', label: 'Hiring' },
  { key: 'cofounder', label: 'Co-founder' },
  { key: 'collaborate', label: 'Collaborate' },
  { key: 'join_project', label: 'Join a Project' },
  { key: 'join_venture', label: 'Join a Venture' },
  { key: 'advisor', label: 'Advisors' },
  { key: 'mentor', label: 'Mentors' },
  { key: 'expert_help', label: 'Expertise' },
]

export function SuggestedOpportunities() {
  const [items, setItems] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [empty, setEmpty] = useState(false)
  const [type, setType] = useState('all')
  const [cacheStatus, setCacheStatus] = useState<'cached' | 'refreshed' | null>(null)

  const load = useCallback(async (t: string) => {
    setLoading(true)
    setError(null)
    setEmpty(false)
    try {
      const params = new URLSearchParams({ limit: '30' })
      if (t && t !== 'all') params.set('type', t)
      const res = await fetch(`/api/looking-for/recommendations?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to load suggestions')
      const data = await res.json()
      setItems(data.suggestions || [])
      setEmpty(!!data.empty)
      setCacheStatus(data.cache_status || null)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load(type)
  }, [type, load])

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

  return (
    <div className="space-y-5">
      {/* Type chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
        {TYPE_CHIPS.map(c => (
          <button
            key={c.key}
            onClick={() => setType(c.key)}
            className={
              'inline-flex items-center h-8 px-3 rounded-md text-[12.5px] font-semibold transition-colors shrink-0 border ' +
              (type === c.key
                ? 'bg-white border-white text-black'
                : 'bg-transparent border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700')
            }
          >
            {c.label}
          </button>
        ))}
      </div>

      {loading ? (
        <CardSkeletonGrid count={6} />
      ) : error ? (
        <EmptyState
          icon={<Warning size={20} weight="regular" />}
          title="Couldn't load suggestions"
          description={error}
        />
      ) : empty || items.length === 0 ? (
        <EmptyState
          icon={<Sparkle size={20} weight="regular" />}
          title="No matches yet"
          description="Add skills to your profile and set your preferences so we can suggest the right opportunities."
          action={
            <div className="flex items-center gap-2">
              <Link
                href="/settings"
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-white text-black hover:bg-zinc-200 text-[13px] font-bold"
              >
                Update profile
                <ArrowRight size={12} weight="bold" />
              </Link>
              <Link
                href="/looking-for"
                className="inline-flex items-center h-9 px-3.5 rounded-md border border-zinc-800 hover:border-zinc-600 text-[13px] font-semibold text-zinc-300"
              >
                Browse Explore
              </Link>
            </div>
          }
        />
      ) : (
        <>
          <div className="flex items-center justify-between text-[12px]">
            <div className="text-zinc-500 font-medium">
              {items.length} matches based on your profile and activity
            </div>
            {cacheStatus === 'refreshed' && (
              <div className="text-[11px] text-zinc-600">Refreshed just now</div>
            )}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {items.map(item => (
              <SuggestedCard
                key={`${item.source_type}-${item.source_id}`}
                item={item}
                onDismiss={() => dismiss(item)}
              />
            ))}
          </div>
        </>
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

  return (
    <div className={
      'relative transition-opacity ' +
      (dismissing ? 'opacity-0' : 'opacity-100')
    }>
      <RequestCard item={item} />

      <div className="mt-2 flex items-start justify-between gap-3 px-1">
        <div className="min-w-0 flex-1">
          {item.match_reasons && item.match_reasons.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {item.match_reasons.slice(0, 2).map((r, i) => (
                <span key={i} className="inline-flex items-center h-5 px-1.5 rounded text-[10.5px] font-semibold uppercase tracking-wider bg-zinc-900 border border-zinc-800 text-zinc-400">
                  {r}
                </span>
              ))}
            </div>
          ) : (
            <div className="text-[11px] text-zinc-500 font-medium">Recommended for you</div>
          )}
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
