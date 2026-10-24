import { CommunityStudioShell } from '@/components/community-hub/studio/CommunityStudioShell'

export const dynamic = 'force-dynamic'

export default async function CommunityStudioPage({
  params,
}: {
  params: Promise<{ draftId: string }>
}) {
  const { draftId } = await params
  return <CommunityStudioShell draftId={draftId} />
}