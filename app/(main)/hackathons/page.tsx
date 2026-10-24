import { DsrtPage, DsrtPanel, DsrtEmpty } from '@/components/dsrt'
import { Code } from 'lucide-react'

export default function HackathonsPage() {
  return (
    <DsrtPage width="narrow" className="py-12">
      <DsrtPanel>
        <DsrtEmpty
          icon={Code}
          title="Global Hackathons"
          description="DSRT Hackathons launch next month. Prepare to build, compete, and win."
        />
      </DsrtPanel>
    </DsrtPage>
  )
}