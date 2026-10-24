'use client'

import { useState, useMemo } from 'react'
import { Users } from '@phosphor-icons/react'
import { EmptyState } from '../EmptyState'
import { FilterChips } from '../FilterChips'
import { ApplicantCard } from './ApplicantCard'
import type { TeamUpApplication, PipelineStage } from '@/types/teamup'

const STAGE_CHIPS = [
  { key: 'all', label: 'All' },
  { key: 'applied', label: 'Applied' },
  { key: 'under_review', label: 'Under review' },
  { key: 'shortlisted', label: 'Shortlisted' },
  { key: 'interview', label: 'Interview' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'rejected', label: 'Rejected' },
]

interface Props {
  applications: TeamUpApplication[]
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onUpdate: (id: string, patch: Partial<TeamUpApplication>) => void
}

export function ApplicantsList({ applications, selectedIds, onToggleSelect, onUpdate }: Props) {
  const [stage, setStage] = useState('all')

  const filtered = useMemo(() => {
    if (stage === 'all') return applications
    return applications.filter(a => a.pipeline_stage === stage)
  }, [applications, stage])

  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = { all: applications.length }
    for (const chip of STAGE_CHIPS) {
      if (chip.key !== 'all') {
        counts[chip.key] = applications.filter(a => a.pipeline_stage === chip.key).length
      }
    }
    return counts
  }, [applications])

  const chipsWithCounts = STAGE_CHIPS.map(c => ({
    ...c,
    label: stageCounts[c.key] > 0 ? `${c.label} · ${stageCounts[c.key]}` : c.label,
  }))

  return (
    <div className="space-y-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
        Applicants
      </div>
      <FilterChips chips={chipsWithCounts} active={stage} onChange={setStage} />

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Users size={20} weight="regular" />}
          title={applications.length === 0 ? 'No applications yet' : 'No applications in this stage'}
          description={applications.length === 0
            ? 'Once people apply to your request, they\'ll appear here.'
            : undefined}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map(app => (
            <ApplicantCard
              key={app.id}
              application={app}
              selected={selectedIds.has(app.id)}
              onToggleSelect={() => onToggleSelect(app.id)}
              onUpdate={(patch) => onUpdate(app.id, patch)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
