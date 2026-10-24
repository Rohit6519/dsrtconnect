import { AppStudioShell } from '@/components/looking-for/application-studio/AppStudioShell'

export const dynamic = 'force-dynamic'

export default async function Page({
  params,
}: {
  params: Promise<{ id: string; applicationId: string }>
}) {
  const { id, applicationId } = await params
  return <AppStudioShell opportunityId={id} applicationId={applicationId} />
}