import { NotificationsPage } from '@/components/notifications/NotificationsPage'
import { DsrtPage } from '@/components/dsrt'

export default function Page() {
  return (
    <DsrtPage width="narrow">
      <NotificationsPage />
    </DsrtPage>
  )
}