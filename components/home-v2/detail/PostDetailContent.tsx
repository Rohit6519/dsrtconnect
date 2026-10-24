'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import {
  Heart, ChatCircle, ArrowsClockwise, BookmarkSimple, ShareNetwork,
  CheckCircle, DotsThree, ThumbsUp, Lightbulb, Confetti, HandsClapping, Question,
  Eye,
} from '@phosphor-icons/react'
import { ReactionPicker } from '../interactions/ReactionPicker'
import { RepostMenu } from '../interactions/RepostMenu'
import { ShareModal } from '../interactions/ShareModal'
import { QuotePostModal } from '../interactions/QuotePostModal'

interface Props {
  post: any
  currentUser: any
  onOpenComments: () => void
  onPostUpdate: (p: any) => void
}

const REACTION_ICON: Record<string, any> = {
  like: ThumbsUp, love: Heart, insightful: Lightbulb,
  celebrate: Confetti, support: HandsClapping, curious: Question,
}
const REACTION_COLOR: Record<string, string> = {
  like: 'text-blue-400',
  love: 'text-pink-500',
  insightful: 'text-amber-400',
  celebrate: 'text-purple-400',
  support: 'text-emerald-400',
  curious: 'text-cyan-400',
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  update:      { label: 'Update',      color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  milestone:   { label: 'Milestone',   color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  idea:        { label: 'Idea',        color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  looking_for: { label: 'Looking For', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  build_log:   { label: 'Build Log',   color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' },
  launch:      { label: 'Launch',      color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
  discussion:  { label: 'Discussion',  color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
}

export function PostDetailContent({ post, currentUser, onOpenComments, onPostUpdate }: Props) {
  const [reactionType, setReactionType] = useState<string | null>(post.current_reaction || null)
  const [reactionCount, setReactionCount] = useState(post.reaction_count || 0)
  const [bookmarked, setBookmarked] = useState(post.is_bookmarked || false)
  const [reposted, setReposted] = useState(post.is_reposted || false)
  const [repostCount, setRepostCount] = useState(post.repost_count || 0)

  const [showReactionPicker, setShowReactionPicker] = useState(false)
  const [showRepostMenu, setShowRepostMenu] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [showQuoteModal, setShowQuoteModal] = useState(false)

  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null)

  const publisher = post.publisher
  if (!publisher) return null

  const publisherHref = publisher.type === 'venture' ? `/ventures/${publisher.slug}` :
                        publisher.type === 'project' ? `/projects/${publisher.slug}` :
                        `/profile/${publisher.handle}`

  const typeMeta = TYPE_LABELS[post.type]
  const timeAgo = post.created_at
    ? formatDistanceToNow(new Date(post.created_at), { addSuffix: true })
    : ''

  const handleReaction = async (type: string) => {
    setShowReactionPicker(false)
    const wasReacted = !!reactionType
    const wasSame = reactionType === type

    if (wasSame) {
      setReactionType(null)
      setReactionCount((n: number) => Math.max(0, n - 1))
      try {
        await fetch(`/api/posts/${post.id}/react`, { method: 'DELETE' })
      } catch { setReactionType(type); setReactionCount((n: number) => n + 1) }
    } else {
      setReactionType(type)
      if (!wasReacted) setReactionCount((n: number) => n + 1)
      try {
        await fetch(`/api/posts/${post.id}/react`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reaction_type: type }),
        })
      } catch {
        setReactionType(wasReacted ? 'like' : null)
        if (!wasReacted) setReactionCount((n: number) => n - 1)
      }
    }
  }

  const handleQuickReact = () => reactionType ? handleReaction(reactionType) : handleReaction('like')

  const handleBookmark = async () => {
    const was = bookmarked
    setBookmarked(!was)
    try {
      await fetch(`/api/posts/${post.id}/bookmark`, { method: was ? 'DELETE' : 'POST' })
    } catch { setBookmarked(was) }
  }

  const handleRepost = async () => {
    setShowRepostMenu(false)
    const was = reposted
    setReposted(!was)
    setRepostCount((n: number) => was ? n - 1 : n + 1)
    try {
      if (was) {
        await fetch(`/api/posts/${post.id}/repost?publisher_type=person&publisher_id=${currentUser.id}`, { method: 'DELETE' })
      } else {
        await fetch(`/api/posts/${post.id}/repost`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ publisher_type: 'person', publisher_id: currentUser.id }),
        })
      }
    } catch {
      setReposted(was)
      setRepostCount((n: number) => was ? n + 1 : n - 1)
    }
  }

  const ActiveIcon = reactionType ? REACTION_ICON[reactionType] : Heart
  const activeColor = reactionType ? REACTION_COLOR[reactionType] : ''

  return (
    <>
      <article className={
        'rounded-2xl border border-zinc-800/60 ' +
        'bg-gradient-to-b from-zinc-900/40 via-zinc-950/40 to-zinc-950/60 ' +
        'shadow-[0_1px_0_rgba(255,255,255,0.03)_inset,0_4px_16px_rgba(0,0,0,0.4)]'
      }>
        <div className="p-6 md:p-8">
          {/* Publisher header */}
          <div className="flex items-start gap-4 mb-5">
            <Link href={publisherHref} className="shrink-0">
              <div className={
                'w-14 h-14 overflow-hidden bg-zinc-900 border border-zinc-800 flex items-center justify-center transition-colors hover:border-zinc-700 ' +
                (publisher.type === 'venture' || publisher.type === 'project' ? 'rounded-xl' : 'rounded-full')
              }>
                {publisher.avatar_url ? (
                  <img src={publisher.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : publisher.icon ? (
                  <span className="text-xl">{publisher.icon}</span>
                ) : (
                  <span className="text-[17px] font-bold text-zinc-400">
                    {publisher.name?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                )}
              </div>
            </Link>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Link href={publisherHref} className="text-[17px] font-bold text-white hover:underline tracking-tight">
                  {publisher.name}
                </Link>
                {publisher.is_verified && <CheckCircle size={14} weight="fill" className="text-blue-400 shrink-0" />}
                {publisher.type === 'venture' && (
                  <span className="text-[10px] font-bold uppercase tracking-[0.08em] px-1.5 py-[1px] rounded border border-zinc-700/60 text-zinc-400 bg-zinc-900/60">
                    VENTURE
                  </span>
                )}
              </div>
              <div className="text-[13px] text-zinc-500 mt-0.5">
                @{publisher.handle}
                {publisher.tagline && <> · <span>{publisher.tagline}</span></>}
              </div>
            </div>

            <button className="w-9 h-9 rounded-md text-zinc-500 hover:text-white hover:bg-zinc-800/60 flex items-center justify-center shrink-0 transition-colors">
              <DotsThree size={17} weight="bold" />
            </button>
          </div>

          {/* Type + Title */}
          {(typeMeta || post.title) && (
            <div className="mb-4 flex items-center gap-2 flex-wrap">
              {typeMeta && (
                <span className={'inline-flex items-center h-6 px-2 rounded-md text-[10.5px] font-bold uppercase tracking-[0.08em] border ' + typeMeta.color}>
                  {typeMeta.label}
                </span>
              )}
              {post.title && (
                <h1 className="text-[22px] md:text-[26px] font-bold text-white leading-snug tracking-tight">
                  {post.title}
                </h1>
              )}
            </div>
          )}

          {/* Content - larger font on detail */}
          {post.content && (
            <div className="text-[16px] text-zinc-100 leading-[1.7] whitespace-pre-wrap mb-5 font-normal">
              {post.content}
            </div>
          )}

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-x-3 gap-y-1 mb-5">
              {post.tags.map((tag: string) => (
                <Link
                  key={tag}
                  href={`/search?q=${encodeURIComponent('#' + tag)}`}
                  className="text-[13px] font-medium text-blue-400 hover:text-blue-300 hover:underline"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          )}

          {/* Media */}
          {(post.image_urls?.length > 0 || post.media_urls?.length > 0) && (
            <PostMedia urls={post.image_urls?.length ? post.image_urls : post.media_urls} />
          )}

          {post.video_url && (
            <div className="rounded-xl overflow-hidden border border-zinc-800 mb-5 bg-zinc-950">
              <video src={post.video_url} controls className="w-full max-h-[600px]" />
            </div>
          )}

          {post.link_url && post.link_title && !post.image_urls?.length && (
            <LinkPreview post={post} />
          )}

          {/* Quoted post */}
          {post.quoted_post && (
            <QuotedPost quoted={post.quoted_post} />
          )}

          {/* Meta line */}
          <div className="text-[12.5px] text-zinc-500 mt-5 pt-4 border-t border-zinc-800/50 flex items-center gap-4 flex-wrap">
            <span>{timeAgo}</span>
            {(post.view_count || 0) > 0 && (
              <span className="inline-flex items-center gap-1">
                <Eye size={11} weight="regular" />
                {post.view_count.toLocaleString()} views
              </span>
            )}
          </div>

          {/* Reaction breakdown */}
          {post.reaction_breakdown && Object.keys(post.reaction_breakdown).length > 0 && (
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              {Object.entries(post.reaction_breakdown).map(([type, count]) => {
                const Icon = REACTION_ICON[type] || Heart
                const color = REACTION_COLOR[type] || 'text-zinc-400'
                return (
                  <div key={type} className="inline-flex items-center gap-1 h-6 px-2 rounded-full border border-zinc-800 bg-zinc-950 text-[11px] font-semibold">
                    <Icon size={11} weight="fill" className={color} />
                    <span className="text-zinc-300 tabular-nums">{count as number}</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Interaction bar */}
          <div className="mt-5 pt-4 border-t border-zinc-800/50 flex items-center gap-1">
            <div
              className="relative"
              onMouseEnter={() => {
                if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
                hoverTimerRef.current = setTimeout(() => setShowReactionPicker(true), 500)
              }}
              onMouseLeave={() => hoverTimerRef.current && clearTimeout(hoverTimerRef.current)}
            >
              <button
                onClick={handleQuickReact}
                className={
                  'inline-flex items-center gap-2 h-10 px-4 rounded-lg text-[13px] font-semibold transition-all ' +
                  (reactionType ? `${activeColor} bg-zinc-800/60` : 'text-zinc-500 hover:text-white hover:bg-zinc-800/60')
                }
              >
                <ActiveIcon size={15} weight={reactionType ? 'fill' : 'regular'} />
                {reactionCount > 0 && <span className="tabular-nums">{reactionCount.toLocaleString()}</span>}
              </button>
              {showReactionPicker && (
                <ReactionPicker
                  currentReaction={reactionType}
                  onSelect={handleReaction}
                  onClose={() => setShowReactionPicker(false)}
                />
              )}
            </div>

            <button
              onClick={onOpenComments}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-lg text-[13px] font-semibold text-zinc-500 hover:text-white hover:bg-zinc-800/60 transition-all"
            >
              <ChatCircle size={15} weight="regular" />
              {(post.comment_count || 0) > 0 && <span className="tabular-nums">{post.comment_count.toLocaleString()}</span>}
            </button>

            <div className="relative">
              <button
                onClick={() => setShowRepostMenu(true)}
                className={
                  'inline-flex items-center gap-2 h-10 px-4 rounded-lg text-[13px] font-semibold transition-all ' +
                  (reposted ? 'text-emerald-500 bg-emerald-500/10' : 'text-zinc-500 hover:text-white hover:bg-zinc-800/60')
                }
              >
                <ArrowsClockwise size={15} weight={reposted ? 'fill' : 'regular'} />
                {repostCount > 0 && <span className="tabular-nums">{repostCount.toLocaleString()}</span>}
              </button>
              {showRepostMenu && (
                <RepostMenu
                  hasReposted={reposted}
                  onRepost={handleRepost}
                  onQuote={() => { setShowRepostMenu(false); setShowQuoteModal(true) }}
                  onClose={() => setShowRepostMenu(false)}
                />
              )}
            </div>

            <div className="ml-auto flex items-center gap-1">
              <button
                onClick={handleBookmark}
                className={
                  'w-10 h-10 rounded-lg flex items-center justify-center transition-all ' +
                  (bookmarked ? 'text-amber-400 bg-amber-500/10' : 'text-zinc-500 hover:text-white hover:bg-zinc-800/60')
                }
              >
                <BookmarkSimple size={15} weight={bookmarked ? 'fill' : 'regular'} />
              </button>
              <button
                onClick={() => setShowShareModal(true)}
                className="w-10 h-10 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800/60 transition-all"
              >
                <ShareNetwork size={15} weight="regular" />
              </button>
            </div>
          </div>
        </div>
      </article>

      {showShareModal && <ShareModal post={post} onClose={() => setShowShareModal(false)} />}
      {showQuoteModal && (
        <QuotePostModal
          post={post}
          currentUser={currentUser}
          onClose={() => setShowQuoteModal(false)}
          onSuccess={() => {
            setShowQuoteModal(false)
            setRepostCount((n: number) => n + 1)
          }}
        />
      )}
    </>
  )
}

function PostMedia({ urls }: { urls: string[] }) {
  const displayUrls = urls.slice(0, 4)
  if (displayUrls.length === 1) {
    return (
      <div className="rounded-xl overflow-hidden border border-zinc-800 mb-5 max-h-[700px] bg-zinc-950">
        <img src={displayUrls[0]} alt="" className="w-full object-cover" />
      </div>
    )
  }
  return (
    <div className={
      'grid gap-1 rounded-xl overflow-hidden border border-zinc-800 mb-5 bg-zinc-950 ' +
      (displayUrls.length === 2 ? 'grid-cols-2 max-h-[420px]' :
       displayUrls.length === 3 ? 'grid-cols-2 grid-rows-2 max-h-[520px]' :
       'grid-cols-2 max-h-[520px]')
    }>
      {displayUrls.map((url, i) => (
        <div key={i} className={'overflow-hidden bg-zinc-900 ' + (displayUrls.length === 3 && i === 0 ? 'row-span-2' : '')}>
          <img src={url} alt="" className="w-full h-full object-cover" />
        </div>
      ))}
    </div>
  )
}

function LinkPreview({ post }: { post: any }) {
  let hostname = ''
  try { hostname = new URL(post.link_url).hostname.replace('www.', '') } catch {}
  return (
    <a href={post.link_url} target="_blank" rel="noopener noreferrer"
       className="block rounded-xl overflow-hidden border border-zinc-800 hover:border-zinc-700 transition-colors mb-5 bg-zinc-950/40">
      {post.link_image && (
        <div className="aspect-[16/9] overflow-hidden bg-zinc-900">
          <img src={post.link_image} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-4">
        <div className="text-[11px] uppercase tracking-[0.08em] font-bold text-zinc-500 mb-1">{hostname}</div>
        <div className="text-[15px] font-bold text-white line-clamp-2 mb-1 tracking-tight">{post.link_title}</div>
        {post.link_description && (
          <p className="text-[12.5px] text-zinc-500 line-clamp-2 leading-relaxed">{post.link_description}</p>
        )}
      </div>
    </a>
  )
}

function QuotedPost({ quoted }: { quoted: any }) {
  const publisher = quoted.publisher
  if (!publisher) return null
  const href = publisher.type === 'venture' ? `/ventures/${publisher.slug}` : `/profile/${publisher.handle}`
  return (
    <Link
      href={`/posts/${quoted.id}`}
      className="block rounded-xl border border-zinc-800 hover:border-zinc-700 bg-zinc-950/60 p-4 mb-5 transition-colors"
    >
      <div className="flex items-center gap-2 mb-2">
        <div className={
          'w-7 h-7 overflow-hidden bg-zinc-900 border border-zinc-800 flex items-center justify-center ' +
          (publisher.type === 'venture' ? 'rounded-md' : 'rounded-full')
        }>
          {publisher.avatar_url ? (
            <img src={publisher.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-[10px] font-bold text-zinc-400">
              {publisher.name?.charAt(0)?.toUpperCase() || '?'}
            </span>
          )}
        </div>
        <span className="text-[13px] font-bold text-white truncate">{publisher.name}</span>
        {publisher.is_verified && <CheckCircle size={11} weight="fill" className="text-blue-400 shrink-0" />}
        <span className="text-[11.5px] text-zinc-500 truncate">@{publisher.handle}</span>
      </div>
      <p className="text-[13.5px] text-zinc-200 line-clamp-4 leading-relaxed">
        {quoted.content || quoted.content_text}
      </p>
    </Link>
  )
}