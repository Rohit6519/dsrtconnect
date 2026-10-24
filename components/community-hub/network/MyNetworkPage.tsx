'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { Compass, RefreshCw } from 'lucide-react'
import { NetworkSummaryStrip } from './NetworkSummaryStrip'
import { CommunitiesBucket } from './CommunitiesBucket'
import { PeopleFromCommunities } from './PeopleFromCommunities'
import { NetworkActivityFeed } from './NetworkActivityFeed'
import { useNetworkSummary } from '@/hooks/useCommunityNetwork'
import { DsrtPage, DsrtSection, DsrtButton } from '@/components/dsrt'

export function MyNetworkPage() {
  const { summary, loading, reload } = useNetworkSummary()
  const [activeBucket, setActiveBucket] = useState<'joined' | 'following' | 'invited' | 'past'>('joined')

  const scrollToId = useCallback((id: string) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const handleNavigate = (bucket: 'joined' | 'following' | 'invited' | 'people') => {
    if (bucket === 'people') {
      scrollToId('people')
      return
    }
    setActiveBucket(bucket)
    setTimeout(() => scrollToId('communities-bucket'), 30)
  }

  const onInvitationResolved = () => {
    reload()
  }

  return (
    <DsrtPage width="wide" className="space-y-8 py-6">
      <DsrtSection
        title="My Network"
        description="Your community graph — communities you're in, following, invited to, and the people you've met through them."
        headerVariant="large"
        actions={
          <div className="flex items-center gap-2">
            <DsrtButton variant="outline" size="sm" onClick={reload}>
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Refresh</span>
            </DsrtButton>
            <DsrtButton asChild variant="white" size="sm">
              <Link href="/community">
                <Compass className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Discover more</span>
                <span className="sm:hidden">Discover</span>
              </Link>
            </DsrtButton>
          </div>
        }
      />

      <div className="space-y-8 sm:space-y-10">
        <NetworkSummaryStrip
          summary={summary}
          loading={loading}
          onNavigate={handleNavigate}
        />

        <div id="communities-bucket">
          <CommunitiesBucket
            initial={activeBucket}
            onInvitationResolved={onInvitationResolved}
          />
        </div>

        <div id="people">
          <PeopleFromCommunities />
        </div>

        <NetworkActivityFeed />
      </div>
    </DsrtPage>
  )
}