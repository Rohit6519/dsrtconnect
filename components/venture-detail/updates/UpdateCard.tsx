'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Heart, BookmarkSimple, ShareNetwork, DotsThree, PencilSimple,
  Trash, Archive, Warning, Copy, PushPin, ChatCircle
} from '@phosphor-icons/react'
import { toast } from 'sonner'

const REACTIONS = [
  { type: 'like', emoji: '👍', label: 'Like' },
  { type: 'love', emoji: '❤️', label: 'Love' },
  { type: 'insightful', emoji: '💡', label: 'Insightful' },
  { type: 'celebrate', emoji: '🎉', label: 'Celebrate' },
  { type: 'support', emoji: '🙌', label: 'Support' },
  { type: 'curious', emoji: '🤔', label: 'Curious' },
  { type: 'thinking', emoji: '🧠', label: 'Thinking' },
]

interface Props {
  update: any
  slug: string
  isOwner: boolean
  currentUserId: string | null
  onEdit: (update: any) => void
  onRefresh: () => void
  onReport: (update: any) => void
}

export function UpdateCard({ update, slug, isOwner, currentUserId, onEdit, onRefresh, onReport }: Props) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [reactionPickerOpen, setReactionPickerOpen] = useState(false)
  const [userReactions, setUserReactions] = useState<string[]>(update.user_reactions || [])
  const [reactionCounts, setReactionCounts] = useState<Record<string, number>>(update.reaction_counts || {})
  const [isSaved, setIsSaved] = useState<boolean>(!!update.is_saved)
  const [saveCount, setSaveCount] = useState<number>(update.save_count || 0)

  const totalReactions = Object.values(reactionCounts).reduce((s: number, c: any) => s + (c || 0), 0)

  const handleReact = async (reactionType: string) => {
    const wasReacted = userReactions.includes(reactionType)

    // Optimistic update
    if (wasReacted) {
      setUserReactions((prev: string[]) => prev.filter(r => r !== reactionType))
      setReactionCounts((prev: Record<string, number>) => ({ ...prev, [reactionType]: Math.max(0, (prev[reactionType] || 0) - 1) }))
    } else {
      setUserReactions((prev: string[]) => [...prev, reactionType])
      setReactionCounts((prev: Record<string, number>) => ({ ...prev, [reactionType]: (prev[reactionType] || 0) + 1 }))
    }
    setReactionPickerOpen(false)

    try {
      const res = await fetch(`/api/ventures/${slug}/updates/${update.id}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reaction_type: reactionType }),
      })
      if (!res.ok) throw new Error()
    } catch {
      // Rollback
      if (wasReacted) {
        setUserReactions((prev: string[]) => [...prev, reactionType])
        setReactionCounts((prev: Record<string, number>) => ({ ...prev, [reactionType]: (prev[reactionType] || 0) + 1 }))
      } else {
        setUserReactions((prev: string[]) => prev.filter(r => r !== reactionType))
        setReactionCounts((prev: Record<string, number>) => ({ ...prev, [reactionType]: Math.max(0, (prev[reactionType] || 0) - 1) }))
      }
      toast.error('Failed to update reaction')
    }
  }

  const handleSave = async () => {
    const wasSaved = isSaved
    // Optimistic
    setIsSaved(!wasSaved)
    setSaveCount((prev: number) => wasSaved ? Math.max(0, prev - 1) : prev + 1)

    try {
      const res = await fetch(`/api/ventures/${slug}/updates/${update.id}/save`, { method: 'POST' })
      if (!res.ok) throw new Error()
      toast.success(wasSaved ? 'Removed from saved' : 'Saved')
    } catch {
      setIsSaved(wasSaved)
      setSaveCount((prev: number) => wasSaved ? prev + 1 : Math.max(0, prev - 1))
      toast.error('Failed')
    }
  }

  const handleShare = () => {
    const url = `${window.location.origin}/ventures/${slug}?update=${update.id}`
    navigator.clipboard.writeText(url)
    toast.success('Link copied')
    setMenuOpen(false)
  }

  const handleDelete = async () => {
    if (!confirm('Delete this update? It can be recovered within 30 days.')) return
    try {
      const res = await fetch(`/api/ventures/${slug}/updates/${update.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('Update deleted')
      onRefresh()
    } catch {
      toast.error('Failed to delete')
    }
    setMenuOpen(false)
  }

  const handleArchive = async () => {
    try {
      const res = await fetch(`/api/ventures/${slug}/updates/${update.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'archived' }),
      })
      if (!res.ok) throw new Error()
      toast.success('Update archived')
      onRefresh()
    } catch {
      toast.error('Failed to archive')
    }
    setMenuOpen(false)
  }

  const handleUnpublish = async () => {
    try {
      const res = await fetch(`/api/ventures/${slug}/updates/${update.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'draft' }),
      })
      if (!res.ok) throw new Error()
      toast.success('Update unpublished')
      onRefresh()
    } catch {
      toast.error('Failed')
    }
    setMenuOpen(false)
  }

  const handlePin = async () => {
    try {
      const res = await fetch(`/api/ventures/${slug}/updates/${update.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_pinned: !update.is_pinned }),
      })
      if (!res.ok) throw new Error()
      toast.success(update.is_pinned ? 'Unpinned' : 'Pinned to top')
      onRefresh()
    } catch {
      toast.error('Failed')
    }
    setMenuOpen(false)
  }

  const publishedDate = update.published_at || update.created_at
  const author = update.author || {}

  return (
    <article className="bg-[#121215] border border-white/[0.06] rounded-2xl overflow-hidden">
      {update.is_pinned && (
        <div className="px-5 py-2 bg-amber-500/[0.05] border-b border-amber-500/10 flex items-center gap-1.5 text-[10.5px] font-semibold text-amber-300 uppercase tracking-wider">
          <PushPin size={11} weight="fill" /> Pinned
        </div>
      )}

      {update.status === 'draft' && (
        <div className="px-5 py-2 bg-blue-500/[0.05] border-b border-blue-500/10 text-[10.5px] font-semibold text-blue-300 uppercase tracking-wider">
          Draft — not visible to others
        </div>
      )}

      {update.status === 'archived' && (
        <div className="px-5 py-2 bg-zinc-800 border-b border-zinc-700 text-[10.5px] font-semibold text-zinc-400 uppercase tracking-wider">
          Archived
        </div>
      )}

      <div className="p-5">
        {/* Author + menu */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {author.avatar_url ? (
              <img src={author.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-white text-sm">
                {author.full_name?.charAt(0) || '?'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-white truncate">
                {author.full_name || 'Team'}
              </p>
              <p className="text-[11px] text-zinc-500 truncate">
                {formatDate(publishedDate)}
                {update.updated_at && update.updated_at !== update.created_at && ' · edited'}
              </p>
            </div>
          </div>

          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-8 h-8 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
            >
              <DotsThree size={16} weight="bold" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1 z-40 bg-[#0d0d10] border border-zinc-800 rounded-xl shadow-2xl p-1 w-48">
                  {isOwner ? (
                    <>
                      <MenuItem icon={PencilSimple} label="Edit" onClick={() => { onEdit(update); setMenuOpen(false) }} />
                      <MenuItem icon={PushPin} label={update.is_pinned ? 'Unpin' : 'Pin to top'} onClick={handlePin} />
                      {update.status === 'published' && (
                        <MenuItem icon={FileText} label="Unpublish" onClick={handleUnpublish} />
                      )}
                      <MenuItem icon={Archive} label="Archive" onClick={handleArchive} />
                      <MenuItem icon={Copy} label="Copy link" onClick={handleShare} />
                      <div className="h-px bg-zinc-800 my-1" />
                      <MenuItem icon={Trash} label="Delete" onClick={handleDelete} destructive />
                    </>
                  ) : (
                    <>
                      <MenuItem icon={Copy} label="Copy link" onClick={handleShare} />
                      <MenuItem icon={Warning} label="Report" onClick={() => { onReport(update); setMenuOpen(false) }} />
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Title */}
        {update.title && (
          <h2 className="text-[19px] font-bold text-white mb-3 leading-tight">{update.title}</h2>
        )}

        {/* Content */}
        <div className="prose-tight text-[14px] text-zinc-200 leading-relaxed space-y-3">
          {Array.isArray(update.content_blocks) && update.content_blocks.length > 0 ? (
            update.content_blocks.map((block: any) => <RenderedBlock key={block.id} block={block} />)
          ) : update.content ? (
            <p className="whitespace-pre-wrap">{update.content}</p>
          ) : null}
        </div>

        {/* Reaction summary */}
        {totalReactions > 0 && (
          <div className="flex items-center gap-1 mt-4 pt-3 border-t border-zinc-800/60">
            <div className="flex items-center -space-x-0.5">
              {Object.entries(reactionCounts)
                .filter(([_, count]) => (count as number) > 0)
                .slice(0, 4)
                .map(([type, _]) => {
                  const reaction = REACTIONS.find(r => r.type === type)
                  return (
                    <span
                      key={type}
                      className="w-5 h-5 rounded-full bg-zinc-800 border border-zinc-900 flex items-center justify-center text-[10px]"
                    >
                      {reaction?.emoji}
                    </span>
                  )
                })}
            </div>
            <span className="text-[11.5px] text-zinc-500 ml-1.5">{totalReactions}</span>
          </div>
        )}

        {/* Action bar */}
        <div className="flex items-center gap-1 mt-4 pt-3 border-t border-zinc-800/60">
          <div className="relative">
            <button
              onClick={() => setReactionPickerOpen(!reactionPickerOpen)}
              className={
                'flex items-center gap-1.5 h-8 px-3 rounded-lg transition-colors ' +
                (userReactions.length > 0
                  ? 'bg-white/[0.06] text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.03]')
              }
            >
              <Heart size={13} weight={userReactions.length > 0 ? 'fill' : 'regular'} />
              <span className="text-[12px] font-semibold">React</span>
            </button>

            {reactionPickerOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setReactionPickerOpen(false)} />
                <div className="absolute left-0 bottom-full mb-2 z-40 bg-[#0d0d10] border border-zinc-800 rounded-full shadow-2xl p-1 flex items-center gap-0.5">
                  {REACTIONS.map(r => (
                    <button
                      key={r.type}
                      onClick={() => handleReact(r.type)}
                      className={
                        'w-9 h-9 rounded-full flex items-center justify-center text-lg hover:bg-zinc-800 hover:scale-125 transition-all ' +
                        (userReactions.includes(r.type) ? 'bg-zinc-800 ring-2 ring-white/20' : '')
                      }
                      title={r.label}
                    >
                      {r.emoji}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <button
            onClick={handleSave}
            className={
              'flex items-center gap-1.5 h-8 px-3 rounded-lg transition-colors ' +
              (isSaved
                ? 'bg-white/[0.06] text-white'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.03]')
            }
          >
            <BookmarkSimple size={13} weight={isSaved ? 'fill' : 'regular'} />
            <span className="text-[12px] font-semibold">Save</span>
            {saveCount > 0 && <span className="text-[11px] text-zinc-500">{saveCount}</span>}
          </button>

          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.03] transition-colors"
          >
            <ShareNetwork size={13} />
            <span className="text-[12px] font-semibold">Share</span>
          </button>

          {(update.view_count > 0 || update.comment_count > 0) && (
            <div className="ml-auto flex items-center gap-3 text-[10.5px] text-zinc-500">
              {update.view_count > 0 && <span>{update.view_count} views</span>}
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

function MenuItem({ icon: Icon, label, onClick, destructive }: any) {
  return (
    <button
      onClick={onClick}
      className={
        'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors ' +
        (destructive
          ? 'text-red-400 hover:bg-red-500/10'
          : 'text-zinc-300 hover:bg-zinc-800 hover:text-white')
      }
    >
      <Icon size={13} />
      <span className="text-[12.5px] font-semibold">{label}</span>
    </button>
  )
}

function RenderedBlock({ block }: { block: any }) {
  if (block.type === 'heading1') return <h1 className="text-[22px] font-bold text-white mt-4 mb-2">{block.content}</h1>
  if (block.type === 'heading2') return <h2 className="text-[17px] font-bold text-white mt-3 mb-1.5">{block.content}</h2>
  if (block.type === 'bullet') return <div className="flex gap-2 pl-2"><span className="text-zinc-500">•</span><span>{block.content}</span></div>
  if (block.type === 'numbered') return <div className="flex gap-2 pl-2"><span className="text-zinc-500 font-mono text-sm">1.</span><span>{block.content}</span></div>
  if (block.type === 'quote') return <blockquote className="pl-3 border-l-2 border-zinc-700 text-zinc-400 italic">{block.content}</blockquote>
  if (block.type === 'callout') return <div className="p-3 bg-white/[0.03] border border-zinc-800 rounded-xl flex gap-2.5"><span>💡</span><span>{block.content}</span></div>
  if (block.type === 'code') return <pre className="p-3 bg-black border border-zinc-800 rounded-lg text-emerald-400 text-[12.5px] font-mono overflow-x-auto"><code>{block.content}</code></pre>
  if (block.type === 'divider') return <hr className="border-zinc-800 my-4" />
  return <p className="whitespace-pre-wrap">{block.content}</p>
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const now = Date.now()
  const diff = now - d.getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })
}

// Placeholder icon
function FileText({ size, ...props }: any) {
  return <PencilSimple size={size} {...props} />
}