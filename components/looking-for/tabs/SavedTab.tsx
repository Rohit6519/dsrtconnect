'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  BookmarkSimple, Warning, ArrowUpRight, X,
  User as UserIcon, Briefcase, CheckCircle,
} from '@phosphor-icons/react'
import { EmptyState } from '../EmptyState'
import { FilterChips } from '../FilterChips'
import { RequestCard } from '../RequestCard'
import type { TeamUpItem } from '@/types/teamup'

interface SavedItem {
  id: string
  user_id: string
  source_type: 'team_up' | 'venture_lf' | 'project_role' | 'user'
  source_id: string
  collection: string
  note: string | null
  saved_at: string
  data: any
}

const CHIPS = [
  { key: 'all', label: 'All' },
  { key: 'opportunities', label: 'Opportunities' },
  { key: 'people', label: 'People' },
]

export function SavedTab() {
  const [saves, setSaves] = useState<SavedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/looking-for/saved')
      if (!res.ok) throw new Error('Failed to load saved items')
      const data = await res.json()
      setSaves(data.saves || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const unsave = async (item: SavedItem) => {
    setSaves(prev => prev.filter(s => !(s.source_type === item.source_type && s.source_id === item.source_id)))
    try {
      await fetch(`/api/looking-for/${item.source_id}/save?source=${item.source_type}`, {
        method: 'DELETE',
      })
    } catch {
      load()
    }
  }

  const filtered = saves.filter(s => {
    // Skip dismissed collection from saved view
    if (s.collection === 'dismissed') return false
    if (filter === 'opportunities') return s.source_type !== 'user'
    if (filter === 'people') return s.source_type === 'user'
    return true
  })

  const counts = {
    opportunities: saves.filter(s => s.source_type !== 'user' && s.collection !== 'dismissed').length,
    people: saves.filter(s => s.source_type === 'user' && s.collection !== 'dismissed').length,
  }

  const chipsWithCounts = CHIPS.map(c => ({
    ...c,
    label: c.key === 'opportunities' ? `Opportunities · ${counts.opportunities}` :
           c.key === 'people'         ? `People · ${counts.people}` :
           `All · ${counts.opportunities + counts.people}`,
  }))

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map(i => (
          <div key={i} className="h-32 rounded-xl border border-zinc-800/80 bg-zinc-950/40 animate-pulse" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <EmptyState
        icon={<Warning size={20} weight="regular" />}
        title="Couldn't load saved items"
        description={error}
      />
    )
  }

  if (saves.length === 0 || (saves.length > 0 && saves.every(s => s.collection === 'dismissed'))) {
    return (
      <EmptyState
        icon={<BookmarkSimple size={20} weight="regular" />}
        title="No saved items yet"
        description="Bookmark opportunities and people you want to revisit. They'll appear here for easy access."
        action={
          <Link
            href="/looking-for"
            className="inline-flex items-center h-9 px-3.5 rounded-md border border-zinc-800 hover:border-zinc-700 text-[13px] text-zinc-300"
          >
            Browse opportunities
          </Link>
        }
      />
    )
  }

  return (
    <div className="space-y-4">
      <FilterChips chips={chipsWithCounts} active={filter} onChange={setFilter} />

      {filtered.length === 0 ? (
        <EmptyState
          icon={<BookmarkSimple size={20} weight="regular" />}
          title={`No saved ${filter === 'people' ? 'people' : 'opportunities'}`}
        />
      ) : filter === 'people' ? (
        <div className="space-y-2">
          {filtered.map(item => (
            <SavedPersonRow key={item.id} item={item} onRemove={() => unsave(item)} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map(item => {
            if (item.source_type === 'user') {
              return (
                <div key={item.id} className="lg:col-span-2">
                  <SavedPersonRow item={item} onRemove={() => unsave(item)} />
                </div>
              )
            }
            return (
              <SavedOpportunity
                key={item.id}
                item={item}
                onRemove={() => unsave(item)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

function SavedOpportunity({ item, onRemove }: { item: SavedItem; onRemove: () => void }) {
  if (!item.data) {
    return (
      <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-4">
        <div className="text-[13px] text-zinc-500 mb-2">This opportunity is no longer available.</div>
        <button
          onClick={onRemove}
          className="text-[12px] text-zinc-400 hover:text-white"
        >
          Remove from saved
        </button>
      </div>
    )
  }

  const opportunityItem: TeamUpItem = {
    ...item.data,
    is_saved: true,
  }

  return (
    <div className="relative">
      <RequestCard item={opportunityItem} />
      <div className="mt-1 flex items-center justify-between px-1">
        <span className="text-[11px] text-zinc-500">
          Saved {timeAgo(item.saved_at)}
        </span>
        <button
          onClick={onRemove}
          className="inline-flex items-center gap-1 text-[10.5px] text-zinc-600 hover:text-red-400 uppercase tracking-wider transition-colors"
        >
          <X size={9} weight="bold" />
          Remove
        </button>
      </div>
    </div>
  )
}

function SavedPersonRow({ item, onRemove }: { item: SavedItem; onRemove: () => void }) {
  const p = item.data
  if (!p) {
    return (
      <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-4">
        <div className="text-[13px] text-zinc-500 mb-2">This person is no longer available.</div>
        <button onClick={onRemove} className="text-[12px] text-zinc-400 hover:text-white">
          Remove
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 hover:border-zinc-700 transition-colors p-4">
      <div className="flex items-start gap-3">
        {p.avatar_url ? (
          <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-800 shrink-0 relative">
            <Image src={p.avatar_url} alt="" fill className="object-cover" sizes="40px" />
          </div>
        ) : (
          <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-[13px] font-medium text-zinc-400 shrink-0">
            {p.full_name?.[0]?.toUpperCase() || '?'}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <Link
            href={`/profile/${p.username}`}
            className="text-[14px] font-semibold text-white hover:text-blue-400 transition-colors"
          >
            {p.full_name}
          </Link>
          {p.tagline && (
            <div className="text-[12.5px] text-zinc-400 truncate">
              {p.tagline}
            </div>
          )}
          <div className="text-[11px] text-zinc-500 mt-1">
            Saved {timeAgo(item.saved_at)}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Link
            href={`/profile/${p.username}`}
            className="inline-flex items-center gap-1 h-8 px-3 rounded-md border border-zinc-800 hover:border-zinc-700 text-[12px] text-zinc-300"
          >
            View
            <ArrowUpRight size={11} weight="bold" />
          </Link>
          <button
            onClick={onRemove}
            className="w-8 h-8 rounded-md border border-zinc-800 hover:border-red-500/30 flex items-center justify-center text-zinc-500 hover:text-red-400"
          >
            <X size={11} weight="bold" />
          </button>
        </div>
      </div>
    </div>
  )
}

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (secs < 60) return 'just now'
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 4) return `${weeks}w ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}
