'use client'

import Link from 'next/link'
import { Users, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface Community {
  id: string
  slug: string
  name: string
}

interface Props {
  identityId: string
  user: {
    id: string
    username: string
    full_name: string
    avatar_url: string | null
    tagline: string | null
    is_verified: boolean
  } | null
  sharedCount: number
  shared: Community[]
}

export function PersonNetworkCard({ user, sharedCount, shared }: Props) {
  if (!user) return null

  const preview = shared.slice(0, 3)
  const remaining = Math.max(0, sharedCount - preview.length)

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-white/[0.01] hover:border-white/[0.12] transition-colors p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Link href={`/profile/${user.username}`} className="flex-shrink-0">
          <Avatar className="w-11 h-11 border border-white/[0.08]">
            <AvatarImage src={user.avatar_url ?? undefined} />
            <AvatarFallback className="text-[12px] bg-white/[0.08] text-white font-semibold">
              {(user.full_name || '?').charAt(0)}
            </AvatarFallback>
          </Avatar>
        </Link>
        <div className="min-w-0 flex-1">
          <Link
            href={`/profile/${user.username}`}
            className="text-[13.5px] font-semibold text-white truncate hover:underline flex items-center gap-1"
          >
            {user.full_name}
            {user.is_verified && (
              <ShieldCheck className="w-3 h-3 text-white/70" strokeWidth={1.75} />
            )}
          </Link>
          <p className="text-[11px] text-white/45 truncate">@{user.username}</p>
        </div>
      </div>

      {user.tagline && (
        <p className="text-[12px] text-white/60 line-clamp-2 leading-relaxed">
          {user.tagline}
        </p>
      )}

      <div className="pt-3 border-t border-white/[0.04] space-y-2">
        <div className="flex items-center gap-1.5 text-[11px] text-white/50">
          <Users className="w-3 h-3" strokeWidth={1.75} />
          <span>
            {sharedCount} shared {sharedCount === 1 ? 'community' : 'communities'}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {preview.map((c) => (
            <Link
              key={c.id}
              href={`/community/${c.slug}`}
              className={cn(
                'inline-flex items-center gap-1 rounded-full border border-white/[0.06] bg-white/[0.02]',
                'text-[10.5px] text-white/70 hover:text-white hover:bg-white/[0.05] px-2 py-0.5 transition-colors'
              )}
            >
              {c.name}
            </Link>
          ))}
          {remaining > 0 && (
            <span className="text-[10.5px] font-mono text-white/40 self-center">
              +{remaining} more
            </span>
          )}
        </div>
      </div>
    </div>
  )
}