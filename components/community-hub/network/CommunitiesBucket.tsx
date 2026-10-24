'use client'

import { useEffect, useState } from 'react'
import { UsersRound, Sparkles, Mail, Archive, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from '@/components/ui/sonner'
import {
  EmptyState,
  ErrorState,
  SkeletonRows,
  SectionHeader,
} from '@/components/kernel-ui'
import { CommunityBucketRow } from './CommunityBucketRow'
import { InvitationCard } from './InvitationCard'
import { useBucketCommunities } from '@/hooks/useCommunityNetwork'

const TABS = [
  { key: 'joined', label: 'Joined', icon: UsersRound },
  { key: 'following', label: 'Following', icon: Sparkles },
  { key: 'invited', label: 'Invitations', icon: Mail },
  { key: 'past', label: 'Past', icon: Archive },
] as const

type BucketKey = (typeof TABS)[number]['key']

interface Props {
  initial?: BucketKey
  onInvitationResolved?: () => void
}

export function CommunitiesBucket({ initial = 'joined', onInvitationResolved }: Props) {
  const [active, setActive] = useState<BucketKey>(initial)
  const { items, loading, error, reload, removeItem } = useBucketCommunities(active)

  useEffect(() => {
    setActive(initial)
  }, [initial])

  const handleLeave = async (communityId: string, name: string) => {
    if (!confirm(`Leave ${name}? You can rejoin later.`)) return
    try {
      const res = await fetch(`/api/v1/communities/${communityId}/leave`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json?.error?.message || 'Could not leave')
        return
      }
      toast.success(`Left ${name}`)
      removeItem((it) => it.community?.id === communityId)
    } catch {
      toast.error('Network error')
    }
  }

  const handleUnfollow = async (communityId: string, name: string) => {
    try {
      const res = await fetch(`/api/v1/communities/${communityId}/follow`, { method: 'DELETE' })
      if (!res.ok) {
        toast.error('Could not unfollow')
        return
      }
      toast.message(`Unfollowed ${name}`)
      removeItem((it) => it.community?.id === communityId)
    } catch {
      toast.error('Network error')
    }
  }

  return (
    <section>
      <div className="flex items-end justify-between gap-4 mb-4 flex-wrap">
        <div>
          <p className="label-mono text-white/50">Communities</p>
          <p className="mt-1 text-[13px] text-white/50">
            Everything you're in, following, or have been invited to.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-full border border-white/[0.06] bg-white/[0.02] p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActive(t.key)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11.5px] font-medium transition-colors',
                active === t.key ? 'bg-white text-black' : 'text-white/60 hover:text-white'
              )}
            >
              <t.icon className="w-3 h-3" strokeWidth={1.75} />
              {t.label}
            </button>
          ))}
          <button
            onClick={reload}
            className="ml-1 w-7 h-7 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors"
            aria-label="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {loading ? (
        <SkeletonRows count={4} />
      ) : error ? (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02]">
          <ErrorState
            title="Could not load communities"
            description="Something went wrong. Try again in a moment."
            errorCode={error}
            onRetry={reload}
          />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02]">
          <EmptyState
            variant="default"
            icon={
              active === 'joined'
                ? UsersRound
                : active === 'following'
                ? Sparkles
                : active === 'invited'
                ? Mail
                : Archive
            }
            title={
              active === 'joined'
                ? 'No communities yet'
                : active === 'following'
                ? 'Not following any communities'
                : active === 'invited'
                ? 'No pending invitations'
                : 'No past memberships'
            }
            description={
              active === 'joined'
                ? 'Explore Discover to find your first community.'
                : active === 'following'
                ? 'Follow communities to keep tabs without joining.'
                : active === 'invited'
                ? 'When someone invites you, it shows up here.'
                : 'Communities you leave will appear here.'
            }
          />
        </div>
      ) : active === 'invited' ? (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((item: any) => (
            <InvitationCard
              key={item.invitation_id}
              invitationId={item.invitation_id}
              message={item.message}
              createdAt={item.created_at}
              expiresAt={item.expires_at}
              roleName={item.role_name}
              inviter={item.inviter}
              community={item.community}
              onResolved={(id) => {
                removeItem((it) => it.invitation_id === id)
                onInvitationResolved?.()
              }}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item: any) => {
            if (active === 'joined') {
              const isOwner = item.role_keys?.includes('OWNER')
              return (
                <CommunityBucketRow
                  key={item.membership_id}
                  community={item.community}
                  roleKeys={item.role_keys}
                  joinedAt={item.joined_at}
                  actions={
                    !isOwner ? (
                      <button
                        onClick={() => handleLeave(item.community.id, item.community.name)}
                        className="rounded-full border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] text-white/70 hover:text-white px-3 py-1 text-[11px] font-medium transition-colors"
                      >
                        Leave
                      </button>
                    ) : null
                  }
                />
              )
            }
            if (active === 'following') {
              return (
                <CommunityBucketRow
                  key={item.community.id}
                  community={item.community}
                  followedAt={item.followed_at}
                  actions={
                    <button
                      onClick={() => handleUnfollow(item.community.id, item.community.name)}
                      className="rounded-full border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] text-white/70 hover:text-white px-3 py-1 text-[11px] font-medium transition-colors"
                    >
                      Unfollow
                    </button>
                  }
                />
              )
            }
            // past
            return (
              <CommunityBucketRow
                key={item.membership_id}
                community={item.community}
                leftAt={item.left_at}
                pastStatus={item.status}
              />
            )
          })}
        </div>
      )}
    </section>
  )
}