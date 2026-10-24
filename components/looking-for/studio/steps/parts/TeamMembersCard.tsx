'use client'

import { ReviewersTeamCard } from './ReviewersTeamCard'

export function TeamMembersCard({ opportunityId }: { opportunityId?: string }) {
  return <ReviewersTeamCard opportunityId={opportunityId || ''} />
}