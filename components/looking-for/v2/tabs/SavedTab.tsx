'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { BookmarkSimple } from '@phosphor-icons/react'
import { OpportunityCard } from '../OpportunityCard'

export function SavedTab() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // Use opportunities list with a saved filter workaround:
      // Fetch all + filter client-side by is_saved flag
      const res = await fetch('/api/opportunities?limit=60')
      const data = await res.json()
      setItems((data.opportunities || []).filter((o: any) => o.is_saved))
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleSave = async (id: string, currentlySaved: boolean) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, is_saved: !currentlySaved } : i))
    try {
      if (currentlySaved) {
        await fetch(`/api/opportunities/${id}/save`, { method: 'DELETE' })
        // Remove from list after brief delay
        setTimeout(() => setItems(prev => prev.filter(i => i.id !== id)), 300)
      } else {
        await fetch(`/api/opportunities/${id}/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        })
      }
    } catch {
      setItems(prev => prev.map(i => i.id === id ? { ...i, is_saved: currentlySaved } : i))
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map(i => (
          <div key={i} className="h-40 rounded-xl border border-zinc-800 bg-zinc-950/40 animate-pulse" />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-800 p-12 text-center">
        <div className="w-12 h-12 mx-auto mb-4 rounded-xl border border-zinc-800 bg-zinc-950 flex items-center justify-center">
          <BookmarkSimple size={20} className="text-zinc-500" />
        </div>
        <h2 className="text-[16px] font-bold text-white mb-1.5">No saved opportunities</h2>
        <p className="text-[12.5px] text-zinc-500 mb-4 max-w-md mx-auto leading-relaxed">
          Save opportunities you're interested in to review them later.
        </p>
        <Link
          href="/looking-for"
          className="inline-flex items-center h-9 px-4 rounded-md border border-zinc-800 hover:border-zinc-700 text-[13px] text-zinc-300 hover:text-white transition-colors"
        >
          Browse opportunities
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map(item => (
        <OpportunityCard
          key={item.id}
          opportunity={item}
          onSave={handleSave}
        />
      ))}
    </div>
  )
}