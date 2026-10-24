import { ThreadDetailPage } from '@/components/mail/ThreadDetailPage'
import { MailErrorBoundary } from '@/components/mail/MailErrorBoundary'
import { CocoPageInjector } from '@/components/coco/CocoPageInjector'

export const metadata = {
  title: 'Conversation | DSRT Mail',
}

export const dynamic = 'force-dynamic'

export default async function Page({
  params,
}: {
  params: Promise<{ threadId: string }>
}) {
  const { threadId } = await params

  return (
    <MailErrorBoundary label="Conversation">
      <CocoPageInjector 
        page="mail_thread" 
        entity={{ type: 'mail_thread', id: threadId }} 
        component={{ registry_id: 'mail.composer' }} 
      />
      <ThreadDetailPage threadId={threadId} />
    </MailErrorBoundary>
  )
}