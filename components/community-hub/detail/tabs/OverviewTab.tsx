'use client'

import Link from 'next/link'
import { CalendarDays, Megaphone, Users, MessagesSquare } from 'lucide-react'
import { format } from 'date-fns'
import type { CommunityDetail } from '@/hooks/useCommunityDetail'
import { useCommunityOverview } from '@/hooks/useCommunityDetail'
import { DsrtPanel, DsrtSection, DsrtEmpty, DsrtSkeleton, DsrtGrid, DsrtAvatar } from '@/components/dsrt'

export function OverviewTab({ detail }: { detail: CommunityDetail }) {
  const { data, loading } = useCommunityOverview(detail.community.slug)

  return (
    <DsrtGrid cols={{ base: 1, lg: 2 }} gap="lg">
      
      {/* Upcoming event */}
      <DsrtPanel>
        <DsrtSection title="Upcoming Event" headerVariant="mono" spacing="sm">
          {loading ? (
            <DsrtSkeleton className="h-16 w-full" />
          ) : !data?.upcoming_event ? (
            <DsrtEmpty
              variant="compact"
              icon={CalendarDays}
              title="No upcoming events"
              description="Check back later, or explore other communities."
            />
          ) : (
            <div className="flex items-start gap-4 pt-2">
              <div className="w-16 h-16 rounded-xl border border-white/[0.08] bg-white/[0.02] flex flex-col items-center justify-center flex-shrink-0 shadow-sm">
                <span className="text-[10px] font-mono uppercase tracking-wider text-white/50 leading-none mb-1">
                  {format(new Date(data.upcoming_event.start_time), 'MMM')}
                </span>
                <span className="text-[20px] font-bold text-white leading-none">
                  {format(new Date(data.upcoming_event.start_time), 'd')}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-bold text-white truncate">
                  {data.upcoming_event.title}
                </p>
                <p className="mt-1 text-[11px] font-mono uppercase tracking-wider text-white/40">
                  {format(new Date(data.upcoming_event.start_time), 'EEE · h:mm a')}
                  {data.upcoming_event.location && ` · ${data.upcoming_event.location}`}
                  {data.upcoming_event.is_online && ' · Online'}
                </p>
                {data.upcoming_event.description && (
                  <p className="mt-2 text-[13px] text-white/60 line-clamp-2 leading-relaxed">
                    {data.upcoming_event.description}
                  </p>
                )}
                <Link
                  href={`/community/${detail.community.slug}/events`}
                  className="mt-3 inline-flex items-center text-[12px] font-medium text-white/50 hover:text-white transition-colors underline"
                >
                  View all events
                </Link>
              </div>
            </div>
          )}
        </DsrtSection>
      </DsrtPanel>

      {/* Latest announcement */}
      <DsrtPanel>
        <DsrtSection title="Latest Announcement" headerVariant="mono" spacing="sm">
          {loading ? (
            <DsrtSkeleton className="h-16 w-full" />
          ) : !data?.latest_announcement ? (
            <DsrtEmpty
              variant="compact"
              icon={Megaphone}
              title="No announcements"
              description="Admins will share updates here."
            />
          ) : (
            <div className="pt-2">
              <p className="text-[13.5px] text-white/80 leading-relaxed line-clamp-4">
                {data.latest_announcement.content}
              </p>
              <p className="mt-3 text-[11px] font-mono uppercase tracking-wider text-white/40">
                {format(new Date(data.latest_announcement.created_at), 'MMM d, yyyy · h:mm a')}
              </p>
            </div>
          )}
        </DsrtSection>
      </DsrtPanel>

      {/* Recent members */}
      <div className="lg:col-span-2">
        <DsrtPanel>
          <DsrtSection
            title="Recent Members"
            headerVariant="mono"
            actions={
              <Link
                href={`/community/${detail.community.slug}/people`}
                className="text-[11px] font-mono uppercase tracking-wider text-white/40 hover:text-white transition-colors"
              >
                See all →
              </Link>
            }
          >
            {loading ? (
              <DsrtSkeleton className="h-10 w-full" />
            ) : (data?.recent_members?.length || 0) === 0 ? (
              <DsrtEmpty variant="compact" icon={Users} title="No members yet" />
            ) : (
              <div className="flex items-center gap-2 flex-wrap pt-2">
                {data!.recent_members.map((u: any) => (
                  <Link
                    key={u.id}
                    href={`/profile/${u.username}`}
                    className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06] transition-colors px-2 py-1.5 pr-3 group"
                  >
                    <DsrtAvatar src={u.avatar_url} name={u.full_name} size="xs" />
                    <span className="text-[12px] font-medium text-white/80 truncate max-w-[140px] group-hover:text-white">
                      {u.full_name}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </DsrtSection>
        </DsrtPanel>
      </div>

      <div className="lg:col-span-2">
        <DsrtPanel>
          <DsrtSection title="Recent Discussion" headerVariant="mono">
            <DsrtEmpty
              variant="compact"
              icon={MessagesSquare}
              title="Discussion is coming"
              description="Posts, announcements, and polls arrive with the content system."
            />
          </DsrtSection>
        </DsrtPanel>
      </div>
    </DsrtGrid>
  )
}