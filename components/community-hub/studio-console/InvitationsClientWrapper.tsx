'use client'

import { InvitationsManager } from './InvitationsManager'
import { useCommunityDetail } from '@/hooks/useCommunityDetail'
import { LoadingState } from '@/components/kernel-ui'

export function InvitationsClientWrapper({ slug }: { slug: string }) {
  const { data, loading } = useCommunityDetail(slug)
  if (loading || !data) return <LoadingState label="Loading…" />
  return <InvitationsManager slug={slug} communityId={data.community.id} />
}