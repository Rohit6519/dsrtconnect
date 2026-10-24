'use client'

import { CircleNotch, Check } from '@phosphor-icons/react'
import { useAssessment } from '../AssessmentContext'

export function AutosaveIndicator() {
  const { saveStatus } = useAssessment()

  if (saveStatus === 'saving') {
    return (
      <span className="inline-flex items-center gap-1 text-[10.5px] text-zinc-500">
        <CircleNotch size={10} className="animate-spin" /> Saving
      </span>
    )
  }
  if (saveStatus === 'saved') {
    return (
      <span className="inline-flex items-center gap-1 text-[10.5px] text-emerald-500">
        <Check size={10} weight="bold" /> Saved
      </span>
    )
  }
  if (saveStatus === 'error') {
    return <span className="text-[10.5px] text-orange-400">Retrying…</span>
  }
  return null
}