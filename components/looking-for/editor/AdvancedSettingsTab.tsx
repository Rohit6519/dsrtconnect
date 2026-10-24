'use client'

import { useState } from 'react'
import type { DraftState, CustomQuestion, ApplicationConfig } from './useDraftEditor'
import { AdvancedSettingsModal } from './AdvancedSettingsModal'

interface Props {
  draft: DraftState
  onChange: (patch: Partial<DraftState>) => void
}

// Reuse the existing modal internals by rendering it inline
export function AdvancedSettingsTab({ draft, onChange }: Props) {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 overflow-hidden">
        <AdvancedSettingsInline draft={draft} onChange={onChange} />
      </div>
    </div>
  )
}

// Bridge to the modal — reuse by passing noop onClose
function AdvancedSettingsInline({ draft, onChange }: Props) {
  const [open, setOpen] = useState(true)
  if (!open) return null
  return <AdvancedSettingsModal draft={draft} onChange={onChange} onClose={() => setOpen(false)} />
}
