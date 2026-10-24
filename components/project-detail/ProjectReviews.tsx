'use client'

import { useState, useEffect, useCallback } from 'react'
import { Star, Heart, ChatCircle, PaperPlaneRight, Certificate, Trash, PencilSimple, X } from '@phosphor-icons/react'

interface Review {
  id: string
  parent_id: string | null
  content: string
  rating: number | null
  like_count: number
  reply_count: number
  is_edited: boolean
  created_at: string
  depth: number
  user_id: string
  user_full_name: string
  user_username: string
  user_avatar: string | null
  user_verified: boolean
  is_founder: boolean
  user_liked: boolean
}

interface Props {
  slug: string
  projectId: string
  currentUserId: string | null
  isOwner: boolean
  isPublic: boolean
}

function timeAgo(dateStr: string): string {
  const now = new Date()
  const d = new Date(dateStr)
  const diff = Math.floor((now.getTime() - d.getTime()) / 60000)
  if (diff < 1) return 'now'
  if (diff < 60) return diff + 'm'
  const h = Math.floor(diff / 60)
  if (h < 24) return h + 'h'
  const days = Math.floor(h / 24)
  if (days < 30) return days + 'd'
  return d.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function ProjectReviews({ slug, projectId, currentUserId, isOwner, isPublic }: Props) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [ratingAvg, setRatingAvg] = useState(0)
  const [ratingCount, setRatingCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showComposer, setShowComposer] = useState(false)
  const [draft, setDraft] = useState('')
  const [draftRating, setDraftRating] = useState(0)
  const [posting, setPosting] = useState(false)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyDraft, setReplyDraft] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState('')

  const fetchReviews = useCallback(async () => {
    try {
      const res = await fetch('/api/projects/' + slug + '/reviews')
      const json = await res.json()
      setReviews(json.reviews || [])
      setRatingAvg(json.rating_avg || 0)
      setRatingCount(json.rating_count || 0)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [slug])

  useEffect(() => { fetchReviews() }, [fetchReviews])

  const postReview = async (parentId?: string) => {
    const content = parentId ? replyDraft.trim() : draft.trim()
    if (!content) return
    setPosting(true)
    try {
      const res = await fetch('/api/projects/' + slug + '/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          parent_id: parentId || null,
          rating: parentId ? null : (draftRating || null),
        }),
      })
      if (!res.ok) {
        const j = await res.json()
        alert(j.error || 'Failed to post')
        return
      }
      if (parentId) {
        setReplyDraft('')
        setReplyingTo(null)
      } else {
        setDraft('')
        setDraftRating(0)
        setShowComposer(false)
      }
      await fetchReviews()
    } finally { setPosting(false) }
  }

  const editReview = async (id: string) => {
    const content = editDraft.trim()
    if (!content) return
    try {
      await fetch('/api/projects/' + slug + '/reviews/' + id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      setEditingId(null)
      setEditDraft('')
      await fetchReviews()
    } catch (e) { console.error(e) }
  }

  const deleteReview = async (id: string) => {
    if (!confirm('Delete this review?')) return
    try {
      await fetch('/api/projects/' + slug + '/reviews/' + id, { method: 'DELETE' })
      await fetchReviews()
    } catch (e) { console.error(e) }
  }

  const toggleLike = async (id: string) => {
    setReviews(prev => prev.map(r => r.id === id
      ? { ...r, user_liked: !r.user_liked, like_count: r.like_count + (r.user_liked ? -1 : 1) }
      : r
    ))
    try {
      await fetch('/api/projects/' + slug + '/reviews/' + id + '/like', { method: 'POST' })
    } catch (e) { console.error(e); fetchReviews() }
  }

  // Build tree from flat threaded list
  const tree = new Map<string | null, Review[]>()
  reviews.forEach(r => {
    const key = r.parent_id
    if (!tree.has(key)) tree.set(key, [])
    tree.get(key)!.push(r)
  })

  const renderReview = (r: Review, depth: number = 0) => {
    const children = tree.get(r.id) || []
    const canEdit = currentUserId === r.user_id
    const canDelete = canEdit || isOwner
    const isEditing = editingId === r.id
    const isReplying = replyingTo === r.id

    return (
      <div key={r.id} className={depth > 0 ? 'ml-6 md:ml-10 mt-3' : 'mt-4'}>
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-white/[0.06] overflow-hidden flex-shrink-0 flex items-center justify-center">
            {r.user_avatar ? (
              <img src={r.user_avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-[12px] font-semibold text-white/80">{(r.user_full_name || '?').charAt(0)}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap mb-1">
              <p className="text-[13px] font-semibold text-white">{r.user_full_name || 'Anonymous'}</p>
              {r.user_verified && <Certificate size={11} weight="fill" className="text-blue-400" />}
              {r.is_founder && (
                <span className="text-[10px] font-semibold text-purple-300 bg-purple-500/15 border border-purple-500/25 px-1.5 py-0.5 rounded">
                  FOUNDER
                </span>
              )}
              <span className="text-[12px] text-white/40">·</span>
              <span className="text-[12px] text-white/45">{timeAgo(r.created_at)}</span>
              {r.is_edited && <span className="text-[11px] text-white/35">· edited</span>}
              {r.rating && (
                <div className="flex items-center gap-0.5 ml-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={11} weight="fill" className={i < r.rating! ? 'text-yellow-400' : 'text-white/15'} />
                  ))}
                </div>
              )}
            </div>

            {isEditing ? (
              <div className="mt-1.5">
                <textarea
                  autoFocus
                  value={editDraft}
                  onChange={(e) => setEditDraft(e.target.value.slice(0, 3000))}
                  rows={3}
                  className="w-full bg-white/[0.04] border border-white/[0.15] rounded-md p-2.5 text-[14px] text-white placeholder:text-white/30 outline-none focus:border-white/30 resize-y"
                />
                <div className="flex items-center justify-end gap-1.5 mt-1.5">
                  <button
                    onClick={() => { setEditingId(null); setEditDraft('') }}
                    className="px-3 h-7 text-[12px] text-white/60 hover:text-white rounded-md border border-white/[0.1]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => editReview(r.id)}
                    className="px-3 h-7 text-[12px] font-semibold bg-white text-black rounded-md"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-[14px] text-white/85 leading-relaxed whitespace-pre-wrap break-words">
                {r.content}
              </p>
            )}

            {!isEditing && (
              <div className="flex items-center gap-4 mt-2">
                <button
                  onClick={() => currentUserId && toggleLike(r.id)}
                  className={
                    'flex items-center gap-1 text-[12px] transition-colors ' +
                    (r.user_liked ? 'text-red-400' : 'text-white/50 hover:text-red-400')
                  }
                >
                  <Heart size={12} weight={r.user_liked ? 'fill' : 'regular'} />
                  {r.like_count > 0 ? r.like_count : ''}
                </button>
                {currentUserId && (
                  <button
                    onClick={() => { setReplyingTo(isReplying ? null : r.id); setReplyDraft('') }}
                    className="flex items-center gap-1 text-[12px] text-white/50 hover:text-white"
                  >
                    <ChatCircle size={12} /> Reply
                  </button>
                )}
                {canEdit && (
                  <button
                    onClick={() => { setEditingId(r.id); setEditDraft(r.content) }}
                    className="text-[12px] text-white/50 hover:text-white"
                  >
                    Edit
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={() => deleteReview(r.id)}
                    className="text-[12px] text-white/50 hover:text-red-400"
                  >
                    Delete
                  </button>
                )}
              </div>
            )}

            {isReplying && (
              <div className="mt-2 flex items-start gap-2">
                <input
                  autoFocus
                  value={replyDraft}
                  onChange={(e) => setReplyDraft(e.target.value.slice(0, 3000))}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); postReview(r.id) } }}
                  placeholder={'Reply to ' + (r.user_full_name || 'this comment')}
                  className="flex-1 bg-white/[0.04] border border-white/[0.15] rounded-md px-3 h-8 text-[13px] text-white placeholder:text-white/30 outline-none focus:border-white/30"
                />
                <button
                  onClick={() => postReview(r.id)}
                  disabled={posting || !replyDraft.trim()}
                  className="w-8 h-8 rounded-md bg-white text-black flex items-center justify-center disabled:opacity-40"
                >
                  <PaperPlaneRight size={12} weight="fill" />
                </button>
              </div>
            )}

            {children.length > 0 && children.map(child => renderReview(child, depth + 1))}
          </div>
        </div>
      </div>
    )
  }

  const topLevel = tree.get(null) || []
  const canReview = currentUserId && isPublic

  return (
    <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl overflow-hidden">
      {/* Header with rating summary */}
      <div className="px-6 py-5 border-b border-white/[0.06]">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-[18px] font-semibold text-white">Reviews & Discussion</h2>
            <p className="text-[13px] text-white/55 mt-0.5">
              {ratingCount > 0
                ? ratingCount + ' review' + (ratingCount !== 1 ? 's' : '') + ' · What people think'
                : 'Be the first to share your thoughts'
              }
            </p>
          </div>
          {ratingCount > 0 && (
            <div className="flex items-center gap-3 bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-2">
              <div>
                <p className="text-[28px] font-bold text-white leading-none">{ratingAvg.toFixed(1)}</p>
                <p className="text-[11px] text-white/45 uppercase tracking-wider mt-1">Rating</p>
              </div>
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={14} weight="fill" className={i < Math.round(ratingAvg) ? 'text-yellow-400' : 'text-white/15'} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      {canReview && (
        <div className="px-6 py-4 border-b border-white/[0.06] bg-white/[0.01]">
          {showComposer ? (
            <div>
              <div className="flex items-center gap-1 mb-3">
                <p className="text-[12px] text-white/60 mr-2">Your rating:</p>
                {Array.from({ length: 5 }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setDraftRating(i + 1 === draftRating ? 0 : i + 1)}
                    className="p-0.5"
                  >
                    <Star size={18} weight="fill" className={i < draftRating ? 'text-yellow-400' : 'text-white/15 hover:text-yellow-400/40'} />
                  </button>
                ))}
                {draftRating > 0 && (
                  <button onClick={() => setDraftRating(0)} className="text-[11px] text-white/40 hover:text-white ml-2">
                    Clear
                  </button>
                )}
              </div>
              <textarea
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value.slice(0, 3000))}
                placeholder="Share your thoughts about this project..."
                rows={4}
                className="w-full bg-white/[0.04] border border-white/[0.15] rounded-md p-3 text-[14px] text-white placeholder:text-white/30 outline-none focus:border-white/30 resize-y"
              />
              <div className="flex items-center justify-end gap-2 mt-2">
                <button
                  onClick={() => { setShowComposer(false); setDraft(''); setDraftRating(0) }}
                  className="px-4 h-8 text-[13px] text-white/70 hover:text-white border border-white/[0.1] rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={() => postReview()}
                  disabled={posting || !draft.trim()}
                  className="px-5 h-8 text-[13px] font-semibold bg-white text-black hover:bg-white/90 rounded-md disabled:opacity-40 flex items-center gap-1.5"
                >
                  {posting ? 'Posting...' : (<><PaperPlaneRight size={12} weight="fill" /> Post</>)}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowComposer(true)}
              className="w-full text-left text-[13px] text-white/50 hover:text-white bg-white/[0.04] hover:bg-white/[0.06] border border-white/[0.1] rounded-md h-10 px-4 transition-colors"
            >
              Write a review or start a discussion...
            </button>
          )}
        </div>
      )}

      {!canReview && !currentUserId && (
        <div className="px-6 py-3 bg-white/[0.02] border-b border-white/[0.06] text-[13px] text-white/50 text-center">
          Sign in to leave a review
        </div>
      )}

      {/* Reviews list */}
      <div className="px-6 py-4">
        {loading ? (
          <div className="py-6 text-center text-[13px] text-white/45">Loading reviews...</div>
        ) : topLevel.length === 0 ? (
          <div className="py-10 text-center">
            <ChatCircle size={30} className="mx-auto mb-3 text-white/25" />
            <p className="text-[14px] text-white/45">No reviews yet</p>
            <p className="text-[12px] text-white/30 mt-1">Be the first to share your thoughts</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {topLevel.map(r => (
              <div key={r.id} className="pb-4">
                {renderReview(r)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
