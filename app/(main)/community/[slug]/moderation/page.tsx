import { StudioConsoleShell } from '@/components/community-hub/studio-console/StudioConsoleShell'
import { ModerationQueue } from '@/components/community-hub/moderation/ModerationQueue'

export const dynamic = 'force-dynamic'

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return (
    <StudioConsoleShell slug={slug} activeKey="moderation">
      <ModerationQueue slug={slug} />
    </StudioConsoleShell>
  )
}