'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Search, Users, ShieldCheck, Crown, Shield, Gavel, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ErrorState } from '@/components/kernel-ui'
import { useCommunityMembers } from '@/hooks/useCommunityDetail'
import type { CommunityDetail } from '@/hooks/useCommunityDetail'
import { DsrtPanel, DsrtInput, DsrtTabs, DsrtEmpty, DsrtGrid, DsrtCardSkeleton, DsrtAvatar } from '@/components/dsrt'

const FILTERS = [
  { value: 'ALL', label: 'All' },
  { value: 'OWNER', label: 'Owners' },
  { value: 'ADMIN', label: 'Admins' },
  { value: 'MODERATOR', label: 'Moderators' },
  { value: 'MEMBER', label: 'Members' },
]

const ROLE_ICON: Record<string, any> = {
  OWNER: Crown,
  ADMIN: Shield,
  MODERATOR: Gavel,
  MEMBER: User,
}

export function PeopleTab({ detail }: { detail: CommunityDetail }) {
  const c = detail.community
  const caps = detail.capabilities
  const showDirectory = detail.settings?.show_member_directory !== false || caps.is_member || caps.is_admin

  const [role, setRole] = useState<string>('ALL')
  const [q, setQ] = useState('')
  
  // Convert 'ALL' back to null for the hook
  const effectiveRole = role === 'ALL' ? null : role
  const { items, loading, loadingMore, hasMore, error, reload, loadMore } = useCommunityMembers(c.slug, effectiveRole, q)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sentinelRef.current || !hasMore || loading) return
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !loadingMore) loadMore()
    }, { rootMargin: '400px' })
    io.observe(sentinelRef.current)
    return () => io.disconnect()
  }, [hasMore, loading, loadingMore, loadMore])

  if (!showDirectory) {
    return (
      <DsrtPanel>
        <DsrtEmpty
          icon={Users}
          title="Directory Hidden"
          description="This community keeps its member list private. Join to see who's in."
        />
      </DsrtPanel>
    )
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
        <DsrtTabs
          variant="segmented"
          tabs={FILTERS}
          activeValue={role}
          onValueChange={setRole}
          className="w-full md:w-auto overflow-x-auto"
        />
        
        <div className="w-full md:w-64 shrink-0">
          <DsrtInput
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search members..."
            icon={<Search size={14} />}
            sizeVariant="md"
          />
        </div>
      </div>

      {loading ? (
        <DsrtCardSkeleton count={6} />
      ) : error ? (
        <DsrtPanel>
          <ErrorState errorCode={error} onRetry={reload} />
        </DsrtPanel>
      ) : items.length === 0 ? (
        <DsrtPanel>
          <DsrtEmpty icon={Users} title="No members found" description="Try a different filter or search." />
        </DsrtPanel>
      ) : (
        <>
          <DsrtGrid cols={{ base: 1, sm: 2, lg: 3 }}>
            {items.map((it: any) => (
              <MemberRow key={it.membership_id} row={it} />
            ))}
          </DsrtGrid>
          
          {hasMore && (
            <div ref={sentinelRef} className="pt-6 flex justify-center">
              {loadingMore && (
                <span className="text-[11px] font-mono uppercase tracking-wider text-white/40">
                  Loading more...
                </span>
              )}
            </div>
          )}
        </>
      )}
    </section>
  )
}

function MemberRow({ row }: { row: any }) {
  const u = row.user
  if (!u) return null
  const Icon = ROLE_ICON[row.top_role] || User

  return (
    <Link
      href={`/profile/${u.username}`}
      className="group flex items-center gap-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.1] p-3.5 transition-colors"
    >
      <DsrtAvatar src={u.avatar_url} name={u.full_name} size="md" />
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-bold text-white truncate group-hover:text-[#93c5fd] transition-colors flex items-center gap-1.5">
          {u.full_name}
          {u.is_verified && <ShieldCheck className="w-3.5 h-3.5 text-[#93c5fd]" strokeWidth={2} />}
        </p>
        <p className="text-[11px] text-white/50 truncate flex items-center gap-1.5 mt-0.5">
          <span className="inline-flex items-center gap-1 font-mono uppercase tracking-wider text-white/70 bg-white/[0.06] px-1.5 py-0.5 rounded border border-white/[0.08]">
            <Icon className="w-3 h-3" strokeWidth={2} />
            {row.top_role.toLowerCase()}
          </span>
          {u.tagline && (
            <span className="truncate text-[12px] pl-1 border-l border-white/[0.1] ml-1">{u.tagline}</span>
          )}
        </p>
      </div>
    </Link>
  )
}