import { StudioConsoleShell } from '@/components/community-hub/studio-console/StudioConsoleShell'
import { AppealsInbox } from '@/components/community-hub/moderation/AppealsInbox'

export const dynamic = 'force-dynamic'

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return (
    <StudioConsoleShell slug={slug} activeKey="appeals">
      <AppealsInbox slug={slug} />
    </StudioConsoleShell>
  )
}