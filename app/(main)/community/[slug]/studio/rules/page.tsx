import { StudioConsoleShell } from '@/components/community-hub/studio-console/StudioConsoleShell'
import { RulesEditor } from '@/components/community-hub/studio-console/RulesEditor'

export const dynamic = 'force-dynamic'

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return (
    <StudioConsoleShell slug={slug} activeKey="rules">
      <RulesEditor slug={slug} />
    </StudioConsoleShell>
  )
}