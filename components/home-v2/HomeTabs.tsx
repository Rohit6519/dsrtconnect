'use client'

import { DsrtTabs } from '@/components/dsrt'

export type HomeTab = 'for-you' | 'latest' | 'ventures' | 'projects'

interface Props {
  active: HomeTab
  onChange: (t: HomeTab) => void
}

const TABS = [
  { value: 'for-you',  label: 'For You' },
  { value: 'latest',   label: 'Latest' },
  { value: 'ventures', label: 'Ventures' },
  { value: 'projects', label: 'Projects' },
]

export function HomeTabs({ active, onChange }: Props) {
  return (
    <DsrtTabs
      variant="segmented"
      tabs={TABS}
      activeValue={active}
      onValueChange={(val) => onChange(val as HomeTab)}
      className="w-full sm:w-auto overflow-x-auto"
    />
  )
}