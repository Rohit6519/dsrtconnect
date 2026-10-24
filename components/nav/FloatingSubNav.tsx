'use client'

import { useActiveNav } from '@/hooks/useActiveNav'
import { DsrtTabs } from '@/components/dsrt'

export function FloatingSubNav() {
  const { activePrimary, activeSub } = useActiveNav()
  
  if (!activePrimary?.children || activePrimary.children.length === 0) {
    return null
  }

  const tabs = activePrimary.children.map(sub => ({
    label: sub.label,
    href: sub.href
  }))

  const activeHref = activeSub?.href || activePrimary.href

  return (
    // FIXED: Explicit height h-[48px] so we know exact math for internal sticky headers (64 + 48 = 112px)
    <div className="sticky top-[64px] z-[40] h-[48px] bg-[#05070D]/95 backdrop-blur-md border-b border-white/[0.06] w-full flex items-end">
      <div className="w-full px-4 lg:px-8">
        <DsrtTabs
          variant="underline"
          tabs={tabs}
          activeValue={activeHref}
          matchMode="exact"
        />
      </div>
    </div>
  )
}