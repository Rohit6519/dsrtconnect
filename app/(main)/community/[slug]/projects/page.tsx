import { CommunityDetailPageClient } from '@/components/community-hub/detail/CommunityDetailPageClient'
import { generateCommunityMetadata } from '@/lib/community/metadata'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return generateCommunityMetadata(slug, 'Projects')
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <CommunityDetailPageClient slug={slug} tab="projects" />
}