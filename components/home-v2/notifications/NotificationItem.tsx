'use client'

import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import {
  Heart, ChatCircle, ArrowsClockwise, Quotes, At,
  UserPlus, Bookmark, ShareNetwork, CheckCircle,
} from '@phosphor-icons/react'

interface Props {
  notification: any
  onRead: (id: string) => void
  onDelete: (id: string) => void
}

const TYPE_META: Record<string, { Icon: any; color: string; verb: string }> = {
  reaction:       { Icon: Heart,           color: 'text-pink-500',    verb: 'reacted to your post' },
  comment:        { Icon: ChatCircle,      color: 'text-blue-400',    verb: 'commented on your post' },
  reply:          { Icon: ChatCircle,      color: 'text-blue-400',    verb: 'replied to you' },
  mention:        { Icon: At,              color: 'text-purple-400',  verb: 'mentioned you' },
  repost:         { Icon: ArrowsClockwise, color: 'text-emerald-400', verb: 'reposted you' },
  quote:          { Icon: Quotes,          color: 'text-emerald-400', verb: 'quoted your post' },
  follow:         { Icon: UserPlus,        color: 'text-blue-400',    verb: 'followed you' },
  venture_follow: { Icon: UserPlus,        color: 'text-blue-400',    verb: 'followed your venture' },
  post_bookmark:  { Icon: Bookmark,        color: 'text-amber-400',   verb: 'bookmarked your post' },
  post_share:     { Icon: ShareNetwork,    color: 'text-zinc-400',    verb: 'shared your post' },
}

export function NotificationItem({ notification, onRead, onDelete }: Props) {
  const meta = TYPE_META[notification.notification_type] || TYPE_META.reaction
  const timeAgo = formatDistanceToNow(new Date(notification.created_at), { addSuffix: false })

  const actor = notification.actor
  const actorVenture = notification.actor_venture
  const displayActor = actorVenture || actor

  const actorName = actorVenture?.name || actor?.full_name || actor?.username || 'Someone'
  const actorAvatar = actorVenture?.logo_url || actor?.avatar_url
  const actorHref = actorVenture
    ? `/ventures/${actorVenture.slug}`
    : actor?.username ? `/profile/${actor.username}` : '#'

  const targetHref = notification.post_id ? `/posts/${notification.post_id}` : actorHref

  const handleClick = async () => {
    if (!notification.is_read) {
      try {
        await fetch(`/api/home/notifications/${notification.id}`, { method: 'PATCH' })
        onRead(notification.id)
      } catch {}
    }
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      await fetch(`/api/home/notifications/${notification.id}`, { method: 'DELETE' })
      onDelete(notification.id)
    } catch {}
  }

  return (
    <Link
      href={targetHref}
      onClick={handleClick}
      className={
        'group relative flex items-start gap-3 p-3 transition-colors ' +
        (notification.is_read
          ? 'hover:bg-zinc-900/40'
          : 'bg-zinc-900/30 hover:bg-zinc-900/60 border-l-2 border-blue-500')
      }
    >
      {/* Unread dot */}
      {!notification.is_read && (
        <span className="absolute top-4 right-3 w-2 h-2 rounded-full bg-blue-500" />
      )}

      {/* Actor avatar with icon overlay */}
      <div className="relative shrink-0">
        <Link href={actorHref} onClick={(e) => e.stopPropagation()}>
          <div className={
            'w-10 h-10 overflow-hidden bg-zinc-900 border border-zinc-800 flex items-center justify-center ' +
            (actorVenture ? 'rounded-lg' : 'rounded-full')
          }>
            {actorAvatar ? (
              <img src={actorAvatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-[11px] font-bold text-zinc-400">
                {actorName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        </Link>
        <div className={
          'absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#0a0a0b] ' +
          'bg-zinc-900'
        }>
          <meta.Icon size={9} weight="fill" className={meta.color} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pr-2">
        <div className="text-[12.5px] text-zinc-200 leading-snug">
          <Link href={actorHref} onClick={(e) => e.stopPropagation()} className="font-bold hover:underline">
            {actorName}
          </Link>
          {actor?.is_verified && (
            <CheckCircle size={9} weight="fill" className="inline text-blue-400 ml-0.5 mb-0.5" />
          )}
          <span className="text-zinc-400"> {meta.verb}</span>
        </div>

        {notification.post_preview?.content && (
          <p className="text-[11.5px] text-zinc-500 mt-1 line-clamp-2 leading-relaxed">
            {notification.post_preview.content}
          </p>
        )}

        <div className="text-[10.5px] text-zinc-600 mt-1">{timeAgo}</div>
      </div>

      {/* Delete */}
      <button
        onClick={handleDelete}
        className="opacity-0 group-hover:opacity-100 shrink-0 w-6 h-6 rounded flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-all"
      >
        <span className="text-[14px] leading-none">×</span>
      </button>
    </Link>
  )
}