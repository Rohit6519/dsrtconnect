import { VenturesDashboard } from '@/components/ventures-hub/VenturesDashboard'
import { DsrtPage } from '@/components/dsrt'

export const metadata = {
  title: 'Ventures | DSRT Connect',
  description: 'Explore, launch and grow ventures on the DSRT platform.',
}

export default function VenturesPage() {
  return (
    <DsrtPage width="wide" padding="none" className="min-h-full py-4 sm:py-6">
      <VenturesDashboard />
    </DsrtPage>
  )
}