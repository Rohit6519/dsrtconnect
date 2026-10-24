import { StudioConsoleShell } from '@/components/community-hub/studio-console/StudioConsoleShell'
import { AuditLogViewer } from '@/components/community-hub/studio-console/AuditLogViewer'

export const dynamic = 'force-dynamic'

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return (
    <StudioConsoleShell slug={slug} activeKey="audit">
      <AuditLogViewer slug={slug} />
    </StudioConsoleShell>
  )
}