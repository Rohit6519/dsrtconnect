'use client'

import { useEffect } from 'react'
import { LoadingState, ErrorState, ForbiddenState } from '@/components/kernel-ui'
import { CommunityHeader } from './CommunityHeader'
import { CommunitySubNav } from './CommunitySubNav'
import { CommunityRightRail } from './CommunityRightRail'
import { useCommunityDetail } from '@/hooks/useCommunityDetail'
import { DsrtPage, DsrtLayoutWithRail, DsrtPanel } from '@/components/dsrt'

interface Props {
  slug: string
  activeTab: 'overview' | 'discussion' | 'events' | 'projects' | 'people' | 'about'
  children: React.ReactNode
}

export function CommunityDetailShell({ slug, activeTab, children }: Props) {
  const { data, loading, error, reload } = useCommunityDetail(slug)

  useEffect(() => {
    if (!data) return
    fetch(`/api/v1/community/${encodeURIComponent(slug)}/track-visit`, {
      method: 'POST',
      keepalive: true,
    }).catch(() => {})
  }, [data?.community?.id, slug])

  if (loading) {
    return (
      <DsrtPage width="wide">
        <LoadingState label="Loading community…" />
      </DsrtPage>
    )
  }

  if (error || !data) {
    return (
      <DsrtPage width="wide">
        <DsrtPanel variant="default" padding="none">
          <ErrorState
            title="Could not load this community"
            description="It may have been archived or renamed."
            errorCode={error || 'UNKNOWN'}
            onRetry={reload}
          />
        </DsrtPanel>
      </DsrtPage>
    )
  }

  if (data.community.status === 'ARCHIVED') {
    return (
      <DsrtPage width="wide">
        <DsrtPanel variant="default" padding="none">
          <ForbiddenState
            title={`${data.community.name} is archived`}
            description="This community is no longer active."
            actionLabel="Explore Discover"
            actionHref="/community"
          />
        </DsrtPanel>
      </DsrtPage>
    )
  }

  const c = data.community
  const caps = data.capabilities
  const isVisibleShell = caps.can_view || c.visibility === 'PUBLIC'

  return (
    <DsrtPage width="wide" className="space-y-5 sm:space-y-6 py-4 sm:py-6">
      <CommunityHeader detail={data} onChanged={reload} />

      <div className="sticky top-[130px] z-20 bg-[#05070D]/95 backdrop-blur-md -mx-4 px-4 md:mx-0 md:px-0 py-1">
        <CommunitySubNav slug={c.slug} memberCount={c.member_count || 0} />
      </div>

      {!isVisibleShell ? (
        <DsrtPanel variant="default" padding="none">
          <ForbiddenState
            title="This community is private"
            description="Join to view its discussion, events, and members."
          />
        </DsrtPanel>
      ) : (
        <DsrtLayoutWithRail
          railBreakpoint="lg"
          rail={<CommunityRightRail detail={data} />}
        >
          <div className="min-w-0">{children}</div>
        </DsrtLayoutWithRail>
      )}
    </DsrtPage>
  )
}