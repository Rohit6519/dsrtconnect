import { Metadata } from 'next'
import { InvitationReviewClient } from './InvitationReviewClient'
import { DsrtPage } from '@/components/dsrt'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Team Invitation | DSRT Connect',
  description: 'You have been invited to join a team on DSRT.',
  robots: { index: false, follow: false },
}

export default async function TeamInvitationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <DsrtPage width="narrow" className="py-10 md:py-16">
      <InvitationReviewClient token={id} />
    </DsrtPage>
  )
}