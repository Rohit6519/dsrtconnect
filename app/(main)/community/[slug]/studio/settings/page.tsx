import { StudioConsoleShell } from '@/components/community-hub/studio-console/StudioConsoleShell'
import { SettingsClientWrapper } from '@/components/community-hub/studio-console/SettingsClientWrapper'

export const dynamic = 'force-dynamic'

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return (
    <StudioConsoleShell slug={slug} activeKey="settings">
      <SettingsClientWrapper slug={slug} />
    </StudioConsoleShell>
  )
}