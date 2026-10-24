'use client'

import { SummaryMetrics } from './SummaryMetrics'
import { AttentionRequired } from './AttentionRequired'
import { RecentActivity } from './RecentActivity'
import { PortfolioPerformance } from './PortfolioPerformance'

export function OverviewPage() {
  return (
    <div className="space-y-6">
      <SummaryMetrics />

      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6 items-start">
        <AttentionRequired />
        <RecentActivity />
      </div>

      <PortfolioPerformance />
    </div>
  )
}