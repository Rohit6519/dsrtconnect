'use client'

import Link from 'next/link'
import { formatDistanceToNow, format } from 'date-fns'
import {
  UserCheck, Mail, Users, TrendingUp, CalendarDays, Activity,
} from 'lucide-react'
import { ErrorState } from '@/components/kernel-ui'
import { formatNumber } from '@/lib/utils'
import { useStudioOverview } from '@/hooks/useCommunityStudio'
// FIXED: Imported DsrtEmpty to fix missing component error
import { DsrtSection, DsrtGrid, DsrtPanel, DsrtSkeleton, DsrtAvatar, DsrtEmpty } from '@/components/dsrt'
import { cn } from '@/lib/utils'

interface Props {
  slug: string
}

export function OverviewCommandCenter({ slug }: Props) {
  const { data, loading, error, reload } = useStudioOverview(slug)

  if (loading) return (
    <div className="space-y-6">
      <DsrtGrid cols={{ base: 2, md: 4 }} gap="md">
        {[1,2,3,4].map(i => <DsrtSkeleton key={i} className="h-28 w-full rounded-2xl" />)}
      </DsrtGrid>
      <DsrtSkeleton className="h-64 w-full rounded-2xl" />
    </div>
  )

  if (error) {
    return (
      <DsrtPanel>
        <ErrorState errorCode={error} onRetry={reload} />
      </DsrtPanel>
    )
  }

  const counts = data?.counts || {}
  const base = `/community/${slug}/studio`

  const tiles = [
    { key: 'apps', label: 'Applications', value: counts.pending_applications ?? 0, icon: UserCheck, href: `${base}/applications`, highlight: (counts.pending_applications ?? 0) > 0 },
    { key: 'inv', label: 'Invitations', value: counts.pending_invitations ?? 0, icon: Mail, href: `${base}/invitations`, highlight: (counts.pending_invitations ?? 0) > 0 },
    { key: 'mem', label: 'Members', value: counts.active_members ?? 0, icon: Users, href: `${base}/members` },
    { key: 'new', label: 'New this week', value: counts.new_members_7d ?? 0, icon: TrendingUp, href: `${base}/members` },
  ]

  return (
    <div className="space-y-8">
      {/* KPIs */}
      <DsrtGrid cols={{ base: 2, lg: 4 }} gap="md">
        {tiles.map((t) => (
          <Link key={t.key} href={t.href} className="block group">
            <DsrtPanel
              padding="md"
              variant={t.highlight ? 'accent' : 'default'}
              className="h-full group-hover:-translate-y-0.5 transition-transform"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center",
                  t.highlight ? "bg-white/10 border border-white/20 text-white" : "bg-white/[0.04] border border-white/[0.08] text-white/50"
                )}>
                  <t.icon className="w-4 h-4" strokeWidth={2} />
                </div>
              </div>
              <p className={cn("text-[26px] font-bold leading-none tracking-tight", t.highlight ? "text-white" : "text-white/90")}>
                {formatNumber(t.value)}
              </p>
              <p className={cn("mt-1.5 text-[10.5px] font-mono uppercase tracking-wider", t.highlight ? "text-white/70" : "text-white/40")}>
                {t.label}
              </p>
            </DsrtPanel>
          </Link>
        ))}
      </DsrtGrid>

      {/* Pending applications preview */}
      <DsrtPanel padding="none" className="overflow-hidden">
        <DsrtSection
          className="p-4 sm:p-5 border-b border-white/[0.06]"
          title="Action Required"
          headerVariant="mono"
          actions={
            <Link href={`${base}/applications`} className="text-[11px] font-mono uppercase tracking-wider text-[#93c5fd] hover:text-white transition-colors">
              Review all →
            </Link>
          }
        />
        {(data?.pending_applications_preview?.length || 0) === 0 ? (
          <DsrtEmpty variant="compact" icon={UserCheck} title="Inbox Zero" description="No pending applications to review." />
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {data.pending_applications_preview.map((a: any) => (
              <div key={a.id} className="flex items-center gap-3 p-4 sm:p-5 hover:bg-white/[0.02] transition-colors">
                <DsrtAvatar src={a.applicant?.avatar_url} name={a.applicant?.full_name} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-white truncate">
                    {a.applicant?.full_name || 'Anonymous applicant'}
                  </p>
                  <p className="text-[11px] text-white/45">
                    Applied {formatDistanceToNow(new Date(a.submitted_at), { addSuffix: true })}
                  </p>
                </div>
                <Link
                  href={`${base}/applications`}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] text-white/80 hover:text-white px-3 py-1.5 text-[12px] font-semibold transition-colors"
                >
                  Review
                </Link>
              </div>
            ))}
          </div>
        )}
      </DsrtPanel>

      <DsrtGrid cols={{ base: 1, lg: 2 }} gap="lg">
        {/* Upcoming events */}
        <DsrtPanel padding="none" className="overflow-hidden">
          <DsrtSection title="Upcoming Events" headerVariant="mono" className="p-4 sm:p-5 border-b border-white/[0.06]" />
          {(data?.upcoming_events?.length || 0) === 0 ? (
            <DsrtEmpty variant="compact" icon={CalendarDays} title="No upcoming events" />
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {data.upcoming_events.map((e: any) => (
                <div key={e.id} className="p-4 sm:p-5 hover:bg-white/[0.02]">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-[#93c5fd] mb-1">
                    {format(new Date(e.start_time), 'EEE · MMM d · h:mm a')}
                  </p>
                  <p className="text-[14px] font-bold text-white line-clamp-1 mb-1">
                    {e.title}
                  </p>
                  <p className="text-[12px] text-white/45">
                    {e.attendee_count || 0} registered
                  </p>
                </div>
              ))}
            </div>
          )}
        </DsrtPanel>

        {/* Recent activity */}
        <DsrtPanel padding="none" className="overflow-hidden">
          <DsrtSection title="Recent Activity" headerVariant="mono" className="p-4 sm:p-5 border-b border-white/[0.06]" />
          {(data?.recent_activity?.length || 0) === 0 ? (
            <DsrtEmpty variant="compact" icon={Activity} title="No activity yet" />
          ) : (
            <ul className="divide-y divide-white/[0.04]">
              {data.recent_activity.map((a: any) => (
                <li key={a.id} className="flex items-start gap-3 p-4 sm:p-5 hover:bg-white/[0.02]">
                  <div className="w-8 h-8 rounded-full border border-white/[0.06] bg-white/[0.02] flex items-center justify-center text-white/50 shrink-0 mt-0.5">
                    <Activity className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-white/80 leading-snug">
                      <span className="font-bold text-white">
                        {a.actor?.full_name || 'System'}
                      </span>{' '}
                      <span className="text-white/50">{a.verb.replace(/^community\./, '').replace(/\./g, ' ')}</span>
                    </p>
                    <p className="mt-1 text-[10px] font-mono uppercase tracking-wider text-white/30">
                      {formatDistanceToNow(new Date(a.occurred_at), { addSuffix: true })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </DsrtPanel>
      </DsrtGrid>
    </div>
  )
}