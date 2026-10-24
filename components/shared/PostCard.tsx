'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { Heart, MessageCircle, Bookmark, Share2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

/**
 * Lightweight PostCard for use outside the Home feed (e.g., Profile tabs).
 */
export function PostCard({ post, currentUser, onDelete }: any) {
  const [isLiked, setIsLiked] = useState(post.is_liked || false)
  const [likeCount, setLikeCount] = useState(post.like_count || 0)
  const [isBookmarked, setIsBookmarked] = useState(post.is_bookmarked || false)
  const supabase = createClient()

  const user = post.users || post.publisher || {}

  const handleLike = async () => {
    const newLiked = !isLiked
    setIsLiked(newLiked)
    setLikeCount((prev: number) => (newLiked ? prev + 1 : prev - 1))
    if (newLiked) {
      await supabase
        .from('post_likes')
        .insert({ post_id: post.id, user_id: currentUser.id })
        .then(() => {}, () => {})
    } else {
      await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', post.id)
        .eq('user_id', currentUser.id)
        .then(() => {}, () => {})
    }
  }

  const handleBookmark = async () => {
    const newBm = !isBookmarked
    setIsBookmarked(newBm)
    if (newBm) {
      await supabase
        .from('post_bookmarks')
        .insert({ post_id: post.id, user_id: currentUser.id })
        .then(() => {}, () => {})
    } else {
      await supabase
        .from('post_bookmarks')
        .delete()
        .eq('post_id', post.id)
        .eq('user_id', currentUser.id)
        .then(() => {}, () => {})
    }
  }

  const handleShare = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/posts/${post.id}`)
  }

  const timeAgo = post.created_at
    ? formatDistanceToNow(new Date(post.created_at), { addSuffix: true })
    : ''

  return (
    <article className="rounded-xl border border-zinc-800/60 bg-gradient-to-b from-zinc-900/40 via-zinc-950/40 to-zinc-950/60 p-4 space-y-3 shadow-[0_1px_0_rgba(255,255,255,0.025)_inset,0_2px_10px_rgba(0,0,0,0.25)] w-full max-w-full overflow-hidden">
      <div className="flex items-start gap-3 min-w-0">
        <Link href={`/profile/${user?.username || ''}`} className="shrink-0">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-[12px] font-bold text-zinc-400">
                {(user?.full_name || user?.username || '?').charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        </Link>
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="flex items-center gap-2 min-w-0">
            <Link
              href={`/profile/${user?.username || ''}`}
              className="text-[14px] font-bold text-white hover:underline truncate tracking-tight"
            >
              {user?.full_name || user?.username || 'Unknown'}
            </Link>
          </div>
          {user?.tagline && (
            <p className="text-[11.5px] text-zinc-500 truncate">{user.tagline}</p>
          )}
          <p className="text-[10.5px] text-zinc-500">{timeAgo}</p>
        </div>
      </div>

      <div className="min-w-0 max-w-full overflow-hidden">
        <p className="text-[14px] text-zinc-200 whitespace-pre-wrap leading-relaxed break-words [word-break:break-word]">
          {post.content}
        </p>
        {post.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2 min-w-0">
            {post.tags.map((tag: string) => (
              <span
                key={tag}
                className="text-[12px] text-blue-400 hover:underline cursor-pointer break-all max-w-full"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {(post.image_urls?.length > 0 || post.media_urls?.length > 0) && (
        <div className="rounded-xl overflow-hidden border border-zinc-800 max-w-full">
          {(post.image_urls || post.media_urls || []).slice(0, 1).map((url: string, i: number) => (
            <img
              key={i}
              src={url}
              alt=""
              className="w-full max-w-full object-cover max-h-[400px]"
            />
          ))}
        </div>
      )}

      <div className="flex items-center gap-1 pt-2 border-t border-zinc-800/50 min-w-0">
        <button
          onClick={handleLike}
          className={
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ' +
            (isLiked
              ? 'text-pink-500 bg-pink-500/10'
              : 'text-zinc-500 hover:text-white hover:bg-zinc-800/60')
          }
        >
          <Heart className={'w-4 h-4' + (isLiked ? ' fill-current' : '')} />
          {likeCount > 0 && likeCount}
        </button>

        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-zinc-500 hover:text-white hover:bg-zinc-800/60 transition-colors">
          <MessageCircle className="w-4 h-4" />
          {post.comment_count > 0 && post.comment_count}
        </button>

        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-zinc-500 hover:text-white hover:bg-zinc-800/60 transition-colors"
        >
          <Share2 className="w-4 h-4" />
        </button>

        <button
          onClick={handleBookmark}
          className={
            'ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ' +
            (isBookmarked
              ? 'text-amber-400 bg-amber-500/10'
              : 'text-zinc-500 hover:text-white hover:bg-zinc-800/60')
          }
        >
          <Bookmark className={'w-4 h-4' + (isBookmarked ? ' fill-current' : '')} />
        </button>
      </div>
    </article>
  )
}