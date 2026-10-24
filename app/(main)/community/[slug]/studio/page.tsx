import { StudioConsoleShell } from '@/components/community-hub/studio-console/StudioConsoleShell'
import { OverviewCommandCenter } from '@/components/community-hub/studio-console/OverviewCommandCenter'

export const dynamic = 'force-dynamic'

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return (
    <StudioConsoleShell slug={slug} activeKey="overview">
      <OverviewCommandCenter slug={slug} />
    </StudioConsoleShell>
  )
}