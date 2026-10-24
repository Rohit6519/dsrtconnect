'use client'

import { DsrtPage, DsrtEmpty, DsrtPanel } from '@/components/dsrt'
import { CalendarDays } from 'lucide-react'

export default function Page() { 
  return (
    <DsrtPage width="narrow" className="py-12">
      <DsrtPanel>
        <DsrtEmpty
          icon={CalendarDays}
          title="Global Events"
          description="The global DSRT event directory is launching soon. Check community pages for local events."
        />
      </DsrtPanel>
    </DsrtPage>
  )
}