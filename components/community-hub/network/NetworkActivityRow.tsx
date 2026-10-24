'use client'

import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import {
  UserPlus,
  UserMinus,
  Megaphone,
  FileText,
  Archive,
  Sparkles,
  Mail,
  Users,
  Clock,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const VERB_META: Record<string, { icon: any; label: (actor: string, community: string) => string }> = {
  'community.created': {
    icon: Sparkles,
    label: (actor, community) => `${actor} launched ${community}`,
  },
  'community.published': {
    icon: Sparkles,
    label: (actor, community) => `${actor} published ${community}`,
  },
  'community.archived': {
    icon: Archive,
    label: (actor, community) => `${actor} archived ${community}`,
  },
  'community.member.joined': {
    icon: UserPlus,
    label: (actor, community) => `${actor} joined ${community}`,
  },
  'community.member.left': {
    icon: UserMinus,
    label: (actor, community) => `${actor} left ${community}`,
  },
  'community.join.requested': {
    icon: Users,
    label: (actor, community) => `${actor} requested to join ${community}`,
  },
  'community.invitation.created': {
    icon: Mail,
    label: (actor, community) => `${actor} invited someone to ${community}`,
  },
  'community.invitation.accepted': {
    icon: UserPlus,
    label: (actor, community) => `${actor} accepted an invitation to ${community}`,
  },
  'community.announcement.published': {
    icon: Megaphone,
    label: (actor, community) => `${actor} posted an announcement in ${community}`,
  },
  'community.post.published': {
    icon: FileText,
    label: (actor, community) => `${actor} posted in ${community}`,
  },
}

interface Props {
  verb: string
  occurredAt: string
  actor: { id: string; full_name: string; username: string; avatar_url: string | null } | null
  community: { id: string; slug: string; name: string; cover_url: string | null } | null
}

export function NetworkActivityRow({ verb, occurredAt, actor, community }: Props) {
  const meta = VERB_META[verb] || {
    icon: Sparkles,
    label: (actor: string, community: string) => `${actor} did something in ${community}`,
  }
  const Icon = meta.icon
  const actorName = actor?.full_name || 'Someone'
  const communityName = community?.name || 'a community'

  return (
    <li className="flex items-start gap-3 p-3.5 rounded-xl border border-white/[0.04] bg-white/[0.02] hover:bg-white/[0.03] hover:border-white/[0.08] transition-colors">
      <div className="flex-shrink-0 w-9 h-9 rounded-full border border-white/[0.06] bg-white/[0.03] flex items-center justify-center text-white/70">
        <Icon className="w-4 h-4" strokeWidth={1.75} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {actor ? (
            <Link href={`/profile/${actor.username}`} className="flex items-center gap-2 min-w-0">
              <Avatar className="w-5 h-5 border border-white/[0.06]">
                <AvatarImage src={actor.avatar_url ?? undefined} />
                <AvatarFallback className="text-[9px] bg-white/[0.06] text-white/80">
                  {actorName.charAt(0)}
                </AvatarFallback>
              </Avatar>
            </Link>
          ) : null}
          <p className="text-[12.5px] text-white/80 truncate leading-tight">
            {actor ? (
              <Link href={`/profile/${actor.username}`} className="font-medium text-white hover:underline">
                {actorName}
              </Link>
            ) : (
              <span className="text-white/70">{actorName}</span>
            )}
            <span className="text-white/50"> {meta.label(actorName, communityName).replace(actorName, '').replace(communityName, '').trim()} </span>
            {community && (
              <Link
                href={`/community/${community.slug}`}
                className="font-medium text-white hover:underline"
              >
                {communityName}
              </Link>
            )}
          </p>
        </div>
        <div className="mt-1 flex items-center gap-1 text-[10.5px] font-mono uppercase tracking-wider text-white/40">
          <Clock className="w-3 h-3" strokeWidth={1.75} />
          {formatDistanceToNow(new Date(occurredAt), { addSuffix: true })}
        </div>
      </div>
    </li>
  )
}