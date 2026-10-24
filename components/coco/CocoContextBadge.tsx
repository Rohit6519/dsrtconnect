// ============================================================
// components/coco/CocoContextBadge.tsx
// Displays "Working with X" indicator in panel header.
// ============================================================

'use client'

import { useEffect, useState } from 'react'
import { getCocoContext, subscribeCocoContext } from '@/lib/coco/sdk/context-registry'
import type { CocoClientContextHint } from '@/types/coco'

const PAGE_LABELS: Record<string, string> = {
  home: 'Home',
  project: 'Project',
  venture: 'Venture',
  venture_assessment: 'Venture Assessment',
  mail_inbox: 'Mail',
  mail_composer: 'Composing Mail',
  community: 'Community',
  profile: 'Profile',
  projects_hub: 'Projects',
  ventures_hub: 'Ventures'
}

export function CocoContextBadge() {
  const [hint, setHint] = useState<CocoClientContextHint>(getCocoContext())

  useEffect(() => {
    return subscribeCocoContext(setHint)
  }, [])

  const label = PAGE_LABELS[hint.page] || hint.page || 'DSRT Connect'

  return (
    <div className="flex items-center gap-2">
      <div className="w-1 h-1 rounded-full bg-white/40" />
      <span className="text-[11px] text-white/40 font-medium tracking-tight truncate max-w-[220px]">
        Working with {label}
      </span>
    </div>
  )
}