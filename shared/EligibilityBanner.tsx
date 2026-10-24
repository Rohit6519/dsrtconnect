'use client'

import { CheckCircle, WarningCircle, XCircle } from '@phosphor-icons/react'

interface Props {
  result: any
}

export function EligibilityBanner({ result }: Props) {
  if (!result) return null

  const { eligible, hard_failures = [], warnings = [] } = result

  if (eligible && warnings.length === 0) {
    return (
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.03] p-4">
        <div className="flex items-start gap-3">
          <CheckCircle size={18} weight="fill" className="text-emerald-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[13px] font-bold text-emerald-300">Eligible</p>
            <p className="text-[11.5px] text-emerald-200/80 mt-0.5">
              This user can be invited without any conflicts.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!eligible) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/[0.03] p-4 space-y-2">
        <div className="flex items-start gap-3">
          <XCircle size={18} weight="fill" className="text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-[13px] font-bold text-red-300">Cannot Invite</p>
            <p className="text-[11.5px] text-red-200/80 mt-0.5">
              The following conflicts prevent this invitation:
            </p>
          </div>
        </div>
        <ul className="ml-9 space-y-1.5">
          {hard_failures.map((f: string, i: number) => (
            <li key={i} className="text-[12px] text-red-300 flex items-start gap-2">
              <span className="text-red-500 mt-1">•</span>
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  // eligible with warnings
  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.03] p-4 space-y-2">
      <div className="flex items-start gap-3">
        <WarningCircle size={18} weight="fill" className="text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-[13px] font-bold text-amber-300">Eligible with Notes</p>
          <p className="text-[11.5px] text-amber-200/80 mt-0.5">
            You can proceed, but be aware of these:
          </p>
        </div>
      </div>
      <ul className="ml-9 space-y-1.5">
        {warnings.map((w: string, i: number) => (
          <li key={i} className="text-[12px] text-amber-200 flex items-start gap-2">
            <span className="text-amber-500 mt-1">•</span>
            <span>{w}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}