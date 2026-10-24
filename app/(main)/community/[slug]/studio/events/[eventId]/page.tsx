import { StudioConsoleShell } from '@/components/community-hub/studio-console/StudioConsoleShell'
import { EventRegistrationsDashboard } from '@/components/community-hub/events/EventRegistrationsDashboard'

export const dynamic = 'force-dynamic'

export default async function Page({ params }: { params: Promise<{ slug: string; eventId: string }> }) {
  const { slug, eventId } = await params
  return (
    <StudioConsoleShell slug={slug} activeKey="overview">
      <EventRegistrationsDashboard slug={slug} eventId={eventId} />
    </StudioConsoleShell>
  )
}