import { CommunityDetailPageClient } from '@/components/community-hub/detail/CommunityDetailPageClient'
import { generateCommunityMetadata } from '@/lib/community/metadata'
import { CocoPageInjector } from '@/components/coco/CocoPageInjector'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return generateCommunityMetadata(slug)
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  
  return (
    <>
      <CocoPageInjector 
        page="community" 
        entity={{ type: 'community', id: slug }} 
        component={{ registry_id: 'community.overview' }} 
      />
      <CommunityDetailPageClient slug={slug} tab="overview" />
    </>
  )
}