'use client'

import { KpiCard } from '../parts/KpiCard'
import { Section } from '../parts/Section'
import { LineArea } from '../parts/LineArea'

export function ReachView({ data }: { data: any }) {
  const k = data.kpis
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Views" value={k.total_views} />
        <KpiCard label="Unique visitors" value={k.unique_viewers} />
        <KpiCard label="Saves" value={k.saves} />
        <KpiCard label="Shares" value={k.shares} />
      </div>

      <Section title="Views & unique visitors" subtitle="Daily distribution of discovery">
        <LineArea
          data={data.series}
          series={[
            { key: 'views', label: 'Views', color: 'rgba(255,255,255,0.9)' },
            { key: 'unique_viewers', label: 'Unique viewers', color: 'rgba(59,130,246,0.9)' },
          ]}
        />
      </Section>

      <Section title="Engagement signals" subtitle="Saves and shares over time">
        <LineArea
          data={data.series}
          series={[
            { key: 'saves', label: 'Saves', color: 'rgba(234,179,8,0.9)' },
            { key: 'shares', label: 'Shares', color: 'rgba(16,185,129,0.9)' },
          ]}
        />
      </Section>
    </div>
  )
}