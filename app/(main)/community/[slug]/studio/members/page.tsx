import { StudioConsoleShell } from '@/components/community-hub/studio-console/StudioConsoleShell'
import { MembersTable } from '@/components/community-hub/studio-console/MembersTable'

export const dynamic = 'force-dynamic'

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return (
    <StudioConsoleShell slug={slug} activeKey="members">
      <MembersTable slug={slug} />
    </StudioConsoleShell>
  )
}