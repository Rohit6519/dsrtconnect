'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  Flag, Check, Circle, Plus, Spinner
} from '@phosphor-icons/react'

interface Milestone {
  id: string
  title: string
  description?: string
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled'
  target_date?: string
  completed_at?: string
  sort_order: number
}

interface Props {
  slug: string
  projectId: string
  isOwner: boolean
}

export function ProjectMilestonesWidget({ slug, projectId, isOwner }: Props) {
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [stats, setStats] = useState({ total: 0, completed: 0 })
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')

  useEffect(() => {
    fetch(`/api/projects/${slug}/milestones`)
      .then(r => r.json())
      .then(d => {
        setMilestones(d.milestones || [])
        setStats(d.stats || { total: 0, completed: 0 })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [slug])

  const toggleStatus = async (id: string, currentStatus: string) => {
    if (!isOwner) return
    const newStatus = currentStatus === 'completed' ? 'planned' : 'completed'

    // Optimistic
    setMilestones(prev =>
      prev.map(m => m.id === id ? { ...m, status: newStatus as any } : m)
    )

    try {
      await fetch(`/api/projects/${slug}/milestones`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      })
    } catch {
      // Revert
      setMilestones(prev =>
        prev.map(m => m.id === id ? { ...m, status: currentStatus as any } : m)
      )
      toast.error('Could not update milestone')
    }
  }

  const addMilestone = async () => {
    if (!newTitle.trim()) return
    setAdding(true)
    try {
      const res = await fetch(`/api/projects/${slug}/milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim() }),
      })
      const d = await res.json()
      if (d.milestone) {
        setMilestones(prev => [...prev, d.milestone])
        setStats(prev => ({ ...prev, total: prev.total + 1 }))
        setNewTitle('')
        toast.success('Milestone added')
      }
    } catch {
      toast.error('Could not add milestone')
    } finally {
      setAdding(false)
    }
  }

  if (!loading && milestones.length === 0 && !isOwner) return null

  return (
    <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <h3 className="text-[15px] font-semibold text-white flex items-center gap-2">
          <Flag size={14} weight="fill" className="text-white/50" />
          Milestones
        </h3>
        {stats.total > 0 && (
          <span className="text-[11px] text-white/40 font-mono">
            {stats.completed}/{stats.total}
          </span>
        )}
      </div>

      {loading ? (
        <div className="p-4 space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-4 w-full bg-white/[0.04] rounded animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="divide-y divide-white/[0.05]">
          {milestones.map(m => {
            const isComplete = m.status === 'completed'
            return (
              <div
                key={m.id}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.02] transition-colors group"
              >
                <button
                  onClick={() => toggleStatus(m.id, m.status)}
                  disabled={!isOwner}
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    isComplete
                      ? 'bg-white border-white text-black'
                      : 'border-white/20 hover:border-white/40'
                  } ${!isOwner ? 'cursor-default' : 'cursor-pointer'}`}
                >
                  {isComplete && <Check size={10} weight="bold" />}
                </button>
                <span className={`text-[13px] flex-1 ${
                  isComplete ? 'text-white/50 line-through' : 'text-white/85'
                }`}>
                  {m.title}
                </span>
              </div>
            )
          })}

          {/* Add new milestone (owner only) */}
          {isOwner && (
            <div className="px-4 py-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addMilestone()}
                  placeholder="Add milestone..."
                  className="flex-1 h-8 px-2.5 bg-white/[0.03] border border-white/[0.08] rounded-md text-[12px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/20"
                />
                <button
                  onClick={addMilestone}
                  disabled={adding || !newTitle.trim()}
                  className="h-8 px-3 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] rounded-md text-[11px] font-semibold text-white disabled:opacity-40 transition-colors flex items-center gap-1"
                >
                  {adding ? <Spinner size={10} className="animate-spin" /> : <Plus size={10} weight="bold" />}
                  Add
                </button>
              </div>
            </div>
          )}

          {milestones.length === 0 && !isOwner && (
            <div className="px-4 py-5 text-center text-[12px] text-white/40">
              No milestones defined.
            </div>
          )}
        </div>
      )}
    </div>
  )
}