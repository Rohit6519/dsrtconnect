'use client'

import { Users } from '@phosphor-icons/react'

interface Props {
  count: number
  sampleName?: string | null
}

export function RecipientsSummary({ count, sampleName }: Props) {
  return (
    <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/40 px-3 py-2.5 flex items-center gap-2.5">
      <Users size={14} className="text-zinc-500 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-[12.5px] font-semibold text-white">
          {count === 1
            ? sampleName || '1 applicant'
            : `${count} applicants`}
        </div>
        <div className="text-[10.5px] text-zinc-500 mt-0.5">
          {count > 1 ? 'Each will receive their own personalized message.' : 'Personalized message will be sent to this applicant.'}
        </div>
      </div>
    </div>
  )
}