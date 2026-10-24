'use client'

import { useState, useEffect } from 'react'
import { Sparkle } from '@phosphor-icons/react'
import { OpportunityCard } from '../OpportunityCard'

export function SuggestedTab() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/opportunities/suggested?limit=24')
      .then(r => r.json())
      .then(d => setItems(d.opportunities || []))
      .catch(e => setError(e?.message || 'Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async (id: string, currentlySaved: boolean) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, is_saved: !currentlySaved } : i))
    try {
      if (currentlySaved) {
        await fetch(`/api/opportunities/${id}/save`, { method: 'DELETE' })
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

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-6 text-center">
        <p className="text-[13px] text-red-400">{error}</p>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-800 p-12 text-center">
        <div className="w-12 h-12 mx-auto mb-4 rounded-xl border border-zinc-800 bg-zinc-950 flex items-center justify-center">
          <Sparkle size={20} className="text-zinc-500" />
        </div>
        <h2 className="text-[16px] font-bold text-white mb-1.5">Building your recommendations</h2>
        <p className="text-[12.5px] text-zinc-500 max-w-md mx-auto leading-relaxed">
          Add your interests, skills, and start engaging with opportunities to unlock personalized suggestions.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-[12.5px] text-zinc-500">
        <Sparkle size={12} weight="fill" className="text-zinc-400" />
        <span>Curated based on your skills, interests, and recent activity.</span>
      </div>
      <div className="space-y-3">
        {items.map(item => (
          <OpportunityCard
            key={item.id}
            opportunity={item}
            onSave={handleSave}
          />
        ))}
      </div>
    </div>
  )
}