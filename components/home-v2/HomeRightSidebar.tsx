'use client'

import { TrendingSection } from './sidebar/TrendingSection'
import { SuggestedVenturesSection } from './sidebar/SuggestedVenturesSection'
import { PeopleYouMayKnowSection } from './sidebar/PeopleYouMayKnowSection'
import { DsrtHighlightsSection } from './sidebar/DsrtHighlightsSection'

export function HomeRightSidebar() {
  return (
    <div className="sticky top-[84px] space-y-4">
      <TrendingSection />
      <SuggestedVenturesSection />
      <PeopleYouMayKnowSection />
      <DsrtHighlightsSection />
    </div>
  )
}