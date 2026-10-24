import { Metadata } from 'next'
import { InvitationsInbox } from '@/components/looking-for/invitations/InvitationsInbox'

export const metadata: Metadata = {
  title: 'Invitations · Team Up · DSRT',
}

export const dynamic = 'force-dynamic'

export default function Page() {
  return <InvitationsInbox />
}
