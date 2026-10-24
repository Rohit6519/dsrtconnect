'use client'

import { usePathname } from 'next/navigation'
import { DsrtTabs } from '@/components/dsrt'

const ITEMS = [
  { href: '/looking-for/my-opportunities', label: 'Overview' },
  { href: '/looking-for/my-opportunities/portfolio', label: 'Opportunities' },
  { href: '/looking-for/my-opportunities/applications', label: 'Applications' },
  { href: '/looking-for/my-opportunities/messages', label: 'Messages' },
  { href: '/looking-for/my-opportunities/analytics', label: 'Analytics' },
]

export function MyOppsSubNav() {
  const pathname = usePathname() || ''

  return (
    <div className="sticky top-[116px] md:top-[64px] z-20 bg-[#05070D]/95 backdrop-blur-md -mx-4 px-4 md:mx-0 md:px-0 py-1 border-b border-white/[0.06]">
      <DsrtTabs
        variant="underline"
        tabs={ITEMS.map((item) => ({
          label: item.label,
          href: item.href,
        }))}
        activeValue={pathname}
        matchMode="prefix"
      />
    </div>
  )
}