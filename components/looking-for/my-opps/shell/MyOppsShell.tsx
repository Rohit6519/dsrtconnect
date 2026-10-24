'use client'

import { MyOppsHeader } from './MyOppsHeader'
import { MyOppsSubNav } from './MyOppsSubNav'
import { DsrtPage } from '@/components/dsrt'

export function MyOppsShell({ children }: { children: React.ReactNode }) {
  return (
    <DsrtPage width="wide" className="space-y-6 py-6 md:py-8">
      <MyOppsHeader />
      <MyOppsSubNav />
      <div className="min-h-[50vh]">{children}</div>
    </DsrtPage>
  )
}