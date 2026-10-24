'use client'

import { SettingsPage } from './SettingsPage'
import { useCommunityDetail } from '@/hooks/useCommunityDetail'
import { LoadingState } from '@/components/kernel-ui'

export function SettingsClientWrapper({ slug }: { slug: string }) {
  const { data, loading } = useCommunityDetail(slug)
  if (loading || !data) return <LoadingState label="Loading settings…" />
  return <SettingsPage slug={slug} communityId={data.community.id} isOwner={!!data.capabilities.is_owner} />
}