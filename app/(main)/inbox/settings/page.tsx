import { Metadata } from 'next'
import { InboxSettingsPage } from '@/components/inbox/InboxSettingsPage'
import { DsrtPage } from '@/components/dsrt'

export const metadata: Metadata = { title: 'Inbox Settings · DSRT' }
export const dynamic = 'force-dynamic'

export default function Page() {
  return (
    <DsrtPage width="default">
      <InboxSettingsPage />
    </DsrtPage>
  )
}