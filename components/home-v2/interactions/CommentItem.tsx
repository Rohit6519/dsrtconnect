'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { Heart, ChatCircle, DotsThree, CheckCircle, Trash } from '@phosphor-icons/react'
import { CommentComposer } from './CommentComposer'

interface Props {
  postId: string
  comment: any
  currentUser: any
  onReplyPosted: (parentId: string, reply: any) => void
  onDeleted: (commentId: string) => void
  isReply?: boolean
}

export function CommentItem({ postId, comment, currentUser, onReplyPosted, onDeleted, isReply }: Props) {
  const [liked, setLiked] = useState(comment.is_liked || false)
  const [likeCount, setLikeCount] = useState(comment.like_count || 0)
  const [showReplyBox, setShowReplyBox] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const isOwn = currentUser?.id === comment.user_id
  const timeAgo = comment.created_at
    ? formatDistanceToNow(new Date(comment.created_at), { addSuffix: false })
    : ''

  const handleLike = async () => {
    const wasLiked = liked
    setLiked(!wasLiked)
    setLikeCount((n: number) => wasLiked ? n - 1 : n + 1)
    try {
      await fetch(`/api/posts/${postId}/comments/${comment.id}?action=${wasLiked ? 'unlike' : 'like'}`, {
        method: 'POST',
      })
    } catch {
      setLiked(wasLiked)
      setLikeCount((n: number) => wasLiked ? n + 1 : n - 1)
    }
  }

  const handleReply = async (content: string) => {
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, parent_id: comment.id }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      if (data.comment) {
        onReplyPosted(comment.id, data.comment)
        setShowReplyBox(false)
      }
    } catch {}
  }

  const handleDelete = async () => {
    if (!confirm('Delete this comment?')) return
    try {
      await fetch(`/api/posts/${postId}/comments/${comment.id}`, { method: 'DELETE' })
      onDeleted(comment.id)
    } catch {}
  }

  return (
    <div className={isReply ? 'pl-10' : ''}>
      <div className="flex gap-2.5">
        <Link href={`/profile/${comment.user?.username || ''}`} className="shrink-0">
          <div className={
            'rounded-full overflow-hidden bg-zinc-900 border border-zinc-800 flex items-center justify-center ' +
            (isReply ? 'w-8 h-8' : 'w-9 h-9')
          }>
            {comment.user?.avatar_url ? (
              <img src={comment.user.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className={isReply ? 'text-[10px] font-bold text-zinc-400' : 'text-[11px] font-bold text-zinc-400'}>
                {(comment.user?.full_name || comment.user?.username || '?').charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        </Link>

        <div className="flex-1 min-w-0">
          <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/60 px-3 py-2">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Link
                href={`/profile/${comment.user?.username || ''}`}
                className="text-[12.5px] font-bold text-white hover:underline truncate tracking-tight"
              >
                {comment.user?.full_name || comment.user?.username || 'Unknown'}
              </Link>
              {comment.user?.is_verified && (
                <CheckCircle size={10} weight="fill" className="text-blue-400 shrink-0" />
              )}
              <span className="text-[10.5px] text-zinc-500 ml-auto shrink-0">{timeAgo}</span>
            </div>
            <p className="text-[13px] text-zinc-200 whitespace-pre-wrap leading-relaxed">
              {comment.content}
            </p>
          </div>

          <div className="mt-1 flex items-center gap-1 pl-2">
            <button
              onClick={handleLike}
              className={
                'inline-flex items-center gap-1 h-6 px-1.5 rounded text-[11px] font-medium transition-colors ' +
                (liked ? 'text-pink-500' : 'text-zinc-500 hover:text-zinc-200')
              }
            >
              <Heart size={10} weight={liked ? 'fill' : 'regular'} />
              {likeCount > 0 && <span className="tabular-nums">{likeCount}</span>}
            </button>

            {!isReply && (
              <button
                onClick={() => setShowReplyBox(!showReplyBox)}
                className="inline-flex items-center gap-1 h-6 px-1.5 rounded text-[11px] font-medium text-zinc-500 hover:text-zinc-200 transition-colors"
              >
                <ChatCircle size={10} weight="regular" />
                Reply
              </button>
            )}

            {isOwn && (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="w-6 h-6 rounded text-zinc-500 hover:text-zinc-200 flex items-center justify-center"
                >
                  <DotsThree size={12} weight="bold" />
                </button>
                {menuOpen && (
                  <div className="absolute left-0 top-full mt-1 w-32 rounded-lg border border-zinc-800 bg-[#0a0a0b] shadow-[0_8px_24px_rgba(0,0,0,0.6)] z-10 py-1">
                    <button
                      onClick={handleDelete}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-[11.5px] text-red-400 hover:bg-zinc-900"
                    >
                      <Trash size={11} weight="regular" />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {showReplyBox && (
            <div className="mt-2">
              <CommentComposer
                currentUser={currentUser}
                onSubmit={handleReply}
                placeholder={`Reply to ${comment.user?.full_name || 'user'}...`}
                compact
              />
            </div>
          )}
        </div>
      </div>

      {/* Nested replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-2 space-y-2">
          {comment.replies.map((r: any) => (
            <CommentItem
              key={r.id}
              postId={postId}
              comment={r}
              currentUser={currentUser}
              onReplyPosted={onReplyPosted}
              onDeleted={onDeleted}
              isReply
            />
          ))}
        </div>
      )}
    </div>
  )
}