import { StudioConsoleShell } from '@/components/community-hub/studio-console/StudioConsoleShell'
import { InvitationsClientWrapper } from '@/components/community-hub/studio-console/InvitationsClientWrapper'

export const dynamic = 'force-dynamic'

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return (
    <StudioConsoleShell slug={slug} activeKey="invitations">
      <InvitationsClientWrapper slug={slug} />
    </StudioConsoleShell>
  )
}