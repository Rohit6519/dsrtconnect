'use client'

import { useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { Compass, TrendingUp, MapPin, LayoutGrid } from 'lucide-react'
import { DiscoverHero } from './DiscoverHero'
import { DiscoverRail } from './DiscoverRail'
import { CategoriesGrid } from './CategoriesGrid'
import { AllCommunitiesGrid } from './AllCommunitiesGrid'
import { useDiscoverList } from '@/hooks/useCommunityDiscover'
import { DsrtPage, DsrtSection } from '@/components/dsrt'

export function CommunityDiscoverPage() {
  const searchParams = useSearchParams()
  const initialCategory = searchParams.get('category') || undefined

  const recommended = useDiscoverList('/api/v1/community/discover/recommended?limit=8')
  const rising = useDiscoverList('/api/v1/community/discover/rising?limit=8')
  const nu = useDiscoverList('/api/v1/community/discover/new?limit=8')
  const nearMe = useDiscoverList('/api/v1/community/discover/near-me?limit=6')

  const hasRecommended = useMemo(() => recommended.items.length > 0, [recommended.items])

  return (
    <DsrtPage width="wide" className="space-y-8 sm:space-y-10 py-4 sm:py-6">
      <DsrtSection
        title="Discover Communities"
        description="Find builders, operators, and peer groups across the DSRT network."
        headerVariant="large"
      />

      <DiscoverHero />

      <DiscoverRail
        title={hasRecommended ? 'Recommended for you' : 'Popular right now'}
        description={
          hasRecommended
            ? 'Based on your interests, network, and activity across DSRT.'
            : 'Explore the communities builders are joining.'
        }
        items={recommended.items}
        loading={recommended.loading}
        error={recommended.error}
        surface="recommended"
        onDismiss={recommended.removeItem}
        emptyIcon={Compass}
        emptyTitle="No recommendations yet"
        emptyDescription="Complete your profile to unlock personalized picks."
        variant="horizontal"
      />

      <DiscoverRail
        title="Rising this week"
        description="Communities with growing membership and activity."
        items={rising.items}
        loading={rising.loading}
        error={rising.error}
        surface="rising"
        onDismiss={rising.removeItem}
        emptyIcon={TrendingUp}
        emptyTitle="No rising communities yet"
      />

      <DiscoverRail
        title="New on DSRT"
        description="Communities that recently opened their doors."
        items={nu.items}
        loading={nu.loading}
        error={nu.error}
        surface="new"
        onDismiss={nu.removeItem}
        emptyIcon={LayoutGrid}
        emptyTitle="No new communities yet"
      />

      {(nearMe.loading || nearMe.items.length > 0) && (
        <DiscoverRail
          title="Near you"
          description="Communities from your city or region."
          items={nearMe.items}
          loading={nearMe.loading}
          error={nearMe.error}
          surface="near_me"
          onDismiss={nearMe.removeItem}
          emptyIcon={MapPin}
          emptyTitle="No communities near you yet"
        />
      )}

      <CategoriesGrid />

      <AllCommunitiesGrid initialCategory={initialCategory} />
    </DsrtPage>
  )
}