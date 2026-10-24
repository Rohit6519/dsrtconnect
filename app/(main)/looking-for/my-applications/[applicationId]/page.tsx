import { ApplicationDetailPage } from '@/components/looking-for/applicant-dashboard/ApplicationDetailPage'

export const dynamic = 'force-dynamic'

export default async function Page({
  params,
}: {
  params: Promise<{ applicationId: string }>
}) {
  const { applicationId } = await params
  return <ApplicationDetailPage applicationId={applicationId} />
}