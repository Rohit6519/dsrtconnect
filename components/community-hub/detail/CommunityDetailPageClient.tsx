'use client'

import { CommunityDetailShell } from './CommunityDetailShell'
import { OverviewTab } from './tabs/OverviewTab'
import { DiscussionTab } from './tabs/DiscussionTab'
import { EventsTab } from './tabs/EventsTab'
import { ProjectsTab } from './tabs/ProjectsTab'
import { PeopleTab } from './tabs/PeopleTab'
import { AboutTab } from './tabs/AboutTab'
import { useCommunityDetail } from '@/hooks/useCommunityDetail'
import { DsrtSkeleton } from '@/components/dsrt'

interface Props {
  slug: string
  tab: 'overview' | 'discussion' | 'events' | 'projects' | 'people' | 'about'
}

export function CommunityDetailPageClient({ slug, tab }: Props) {
  return (
    <CommunityDetailShell slug={slug} activeTab={tab}>
      <TabRouter slug={slug} tab={tab} />
    </CommunityDetailShell>
  )
}

function TabRouter({ slug, tab }: Props) {
  const { data, loading } = useCommunityDetail(slug)
  if (loading || !data) {
    return (
      <div className="space-y-3">
        <DsrtSkeleton className="h-8 w-40" />
        <DsrtSkeleton className="h-48 w-full rounded-2xl" />
        <DsrtSkeleton className="h-32 w-full rounded-2xl" />
      </div>
    )
  }

  switch (tab) {
    case 'overview':
      return <OverviewTab detail={data} />
    case 'discussion':
      return <DiscussionTab detail={data} />
    case 'events':
      return <EventsTab detail={data} />
    case 'projects':
      return <ProjectsTab detail={data} />
    case 'people':
      return <PeopleTab detail={data} />
    case 'about':
      return <AboutTab detail={data} />
  }
}