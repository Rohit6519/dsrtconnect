import { MailPage } from '@/components/mail/MailPage'
import { CocoPageInjector } from '@/components/coco/CocoPageInjector'

export const metadata = {
  title: 'DSRT Mail',
  description: 'Unified communication for DSRT Connect',
}

export const dynamic = 'force-dynamic'

export default function Page() {
  return (
    <>
      <CocoPageInjector 
        page="mail_inbox" 
        component={{ registry_id: 'mail.inbox' }} 
      />
      <MailPage />
    </>
  )
}