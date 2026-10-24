'use client'

import { useEffect, useRef } from 'react'
import { formatDistanceToNow, format } from 'date-fns'
import { History, ChevronDown } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { SectionHeader, EmptyState, LoadingState, SkeletonRows } from '@/components/kernel-ui'
import { useStudioAudit } from '@/hooks/useCommunityStudio'

interface Props {
  slug: string
}

const ACTION_LABEL: Record<string, string> = {
  'community.created': 'created the community',
  'community.updated': 'updated community',
  'community.published': 'published community',
  'community.archived': 'archived community',
  'community.settings.updated': 'updated settings',
  'community.rules.updated': 'updated rules',
  'community.member.joined': 'joined',
  'community.member.left': 'left',
  'community.member.suspend': 'suspended a member',
  'community.member.unsuspend': 'reinstated a member',
  'community.member.ban': 'banned a member',
  'community.member.unban': 'lifted ban',
  'community.member.remove': 'removed a member',
  'community.member.reinstate': 'reinstated a member',
  'community.role.assigned': 'assigned a role',
  'community.invitation.created': 'sent an invitation',
  'community.invitation.accepted': 'accepted an invitation',
  'community.invitation.revoked': 'revoked an invitation',
  'community.application.submitted': 'submitted an application',
  'community.application.approved': 'approved an application',
  'community.application.rejected': 'rejected an application',
  'community.ownership.transferred': 'transferred ownership',
}

export function AuditLogViewer({ slug }: Props) {
  const { items, loading, loadingMore, hasMore, reload, loadMore } = useStudioAudit(slug)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sentinelRef.current || !hasMore || loading) return
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) loadMore()
    }, { rootMargin: '400px' })
    io.observe(sentinelRef.current)
    return () => io.disconnect()
  }, [hasMore, loading, loadMore])

  return (
    <section>
      <SectionHeader
        title="Audit log"
        description="Every significant action taken in this community, permanently recorded."
        variant="mono"
      />

      {loading ? (
        <SkeletonRows count={6} />
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02]">
          <EmptyState icon={History} title="No audit records yet" />
        </div>
      ) : (
        <>
          <ul className="space-y-2">
            {items.map((a: any) => (
              <li key={a.id} className="flex items-start gap-3 rounded-xl border border-white/[0.04] bg-white/[0.02] p-3">
                <Avatar className="w-8 h-8 border border-white/[0.06] flex-shrink-0">
                  <AvatarImage src={a.actor?.avatar_url ?? undefined} />
                  <AvatarFallback className="text-[10px] bg-white/[0.06] text-white/80">
                    {(a.actor?.full_name || 'S').charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] text-white/85 leading-tight">
                    <span className="font-medium text-white">{a.actor?.full_name || 'System'}</span>{' '}
                    <span className="text-white/55">{ACTION_LABEL[a.action] || a.action}</span>
                  </p>
                  <p className="mt-0.5 text-[10.5px] font-mono uppercase tracking-wider text-white/40">
                    {format(new Date(a.created_at), 'MMM d · h:mm a')} · {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                  </p>
                  {a.metadata && Object.keys(a.metadata).length > 0 && (
                    <details className="mt-2 group">
                      <summary className="cursor-pointer text-[10.5px] font-mono uppercase tracking-wider text-white/40 hover:text-white/60 inline-flex items-center gap-1">
                        Details <ChevronDown className="w-3 h-3 group-open:rotate-180 transition-transform" />
                      </summary>
                      <pre className="mt-2 text-[10.5px] font-mono text-white/50 bg-black/30 border border-white/[0.04] rounded-md p-2 overflow-x-auto">
                        {JSON.stringify(a.metadata, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </li>
            ))}
          </ul>
          {hasMore && (
            <div ref={sentinelRef} className="pt-6">
              {loadingMore && <LoadingState variant="compact" label="Loading more…" />}
            </div>
          )}
        </>
      )}
    </section>
  )
}