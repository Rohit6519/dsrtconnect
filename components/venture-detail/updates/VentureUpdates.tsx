'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, CircleNotch, Newspaper, FileText, Archive as ArchiveIcon } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { UpdateCard } from './UpdateCard'
import { UpdateComposer } from './UpdateComposer'
import { ReportUpdateModal } from './ReportUpdateModal'

interface Props {
  venture: any
  updates: any[]  // Initial updates from parent (may be stale — we refetch)
  slug: string
  isOwner: boolean
  currentUserId: string | null
}

type TabType = 'published' | 'draft' | 'archived'

export function VentureUpdates({ venture, slug, isOwner, currentUserId }: Props) {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<TabType>('published')
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [composerOpen, setComposerOpen] = useState(false)
  const [editingUpdate, setEditingUpdate] = useState<any | null>(null)
  const [reportingUpdate, setReportingUpdate] = useState<any | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/ventures/${slug}/updates?status=${activeTab}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed')
      setItems(json.updates || [])
    } catch (e: any) {
      toast.error(e.message || 'Failed to load updates')
    } finally {
      setLoading(false)
    }
  }, [slug, activeTab])

  useEffect(() => { load() }, [load])

  // Real-time sync
  useEffect(() => {
    if (!venture.id) return
    const channel = supabase
      .channel(`venture-updates:${venture.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'venture_updates',
          filter: `venture_id=eq.${venture.id}`,
        },
        () => { load() }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [venture.id, load, supabase])

  const handleEdit = (update: any) => {
    setEditingUpdate(update)
    setComposerOpen(true)
  }

  const handleReport = (update: any) => {
    setReportingUpdate(update)
  }

  const handleNewUpdate = () => {
    setEditingUpdate(null)
    setComposerOpen(true)
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-[20px] font-bold text-white">Updates</h2>
          <p className="text-[12.5px] text-white/50 mt-0.5">
            Share progress, wins, and announcements with your community
          </p>
        </div>

        {isOwner && (
          <button
            onClick={handleNewUpdate}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-white text-black font-bold text-[12.5px] hover:bg-zinc-100 shadow-md transition-colors"
          >
            <Plus size={14} weight="bold" /> New update
          </button>
        )}
      </div>

      {/* Tabs (owner only) */}
      {isOwner && (
        <div className="flex items-center gap-1 border-b border-white/[0.08] pb-3">
          {[
            { id: 'published' as TabType, label: 'Published', icon: Newspaper },
            { id: 'draft' as TabType, label: 'Drafts', icon: FileText },
            { id: 'archived' as TabType, label: 'Archived', icon: ArchiveIcon },
          ].map(tab => {
            const Icon = tab.icon
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={
                  'flex items-center gap-1.5 text-[12.5px] font-semibold px-3.5 h-8 rounded-lg transition-colors ' +
                  (active
                    ? 'bg-white/[0.08] text-white border border-white/[0.12]'
                    : 'text-white/50 hover:text-white hover:bg-white/[0.03]')
                }
              >
                <Icon size={13} weight={active ? 'fill' : 'regular'} />
                {tab.label}
              </button>
            )
          })}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="h-40 rounded-2xl border border-white/[0.06] bg-white/[0.02] flex items-center justify-center text-zinc-500 gap-2 text-sm">
          <CircleNotch size={16} className="animate-spin" /> Loading updates…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.01] p-16 text-center">
          <Newspaper size={32} className="text-white/20 mx-auto mb-3" />
          <h3 className="text-[15px] font-bold text-white mb-1">
            {activeTab === 'draft' ? 'No drafts' : activeTab === 'archived' ? 'No archived updates' : 'No updates yet'}
          </h3>
          <p className="text-[12.5px] text-white/45 max-w-sm mx-auto mb-6">
            {isOwner
              ? 'Share your first update. Announce a milestone, celebrate a win, or share progress.'
              : 'This venture has not shared any updates yet.'}
          </p>
          {isOwner && activeTab === 'published' && (
            <button
              onClick={handleNewUpdate}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-white text-black text-[12.5px] font-bold"
            >
              <Plus size={13} weight="bold" /> Write first update
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {items.map(update => (
            <UpdateCard
              key={update.id}
              update={update}
              slug={slug}
              isOwner={isOwner}
              currentUserId={currentUserId}
              onEdit={handleEdit}
              onRefresh={load}
              onReport={handleReport}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <UpdateComposer
        open={composerOpen}
        onClose={() => { setComposerOpen(false); setEditingUpdate(null) }}
        slug={slug}
        existingUpdate={editingUpdate}
        onSuccess={load}
      />

      <ReportUpdateModal
        open={!!reportingUpdate}
        onClose={() => setReportingUpdate(null)}
        slug={slug}
        update={reportingUpdate}
      />
    </div>
  )
}