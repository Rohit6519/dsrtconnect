'use client'

import { usePathname } from 'next/navigation'
import { DsrtTabs, DsrtTabItem } from '@/components/dsrt'

interface Props {
  slug: string
  memberCount: number
}

export function CommunitySubNav({ slug, memberCount }: Props) {
  const pathname = usePathname()
  const base = `/community/${slug}`

  // Ensure activeValue aligns perfectly with prefix matching
  let activeValue = 'overview'
  if (pathname.includes('/discussion')) activeValue = 'discussion'
  if (pathname.includes('/events')) activeValue = 'events'
  if (pathname.includes('/projects')) activeValue = 'projects'
  if (pathname.includes('/people')) activeValue = 'people'
  if (pathname.includes('/about')) activeValue = 'about'

  const tabs: DsrtTabItem[] = [
    { value: 'overview', label: 'Overview', href: base },
    { value: 'discussion', label: 'Discussion', href: `${base}/discussion` },
    { value: 'events', label: 'Events', href: `${base}/events` },
    { value: 'projects', label: 'Projects', href: `${base}/projects` },
    { value: 'people', label: 'People', href: `${base}/people`, badge: memberCount },
    { value: 'about', label: 'About', href: `${base}/about` },
  ]

  return (
    <div className="w-full">
      <DsrtTabs
        variant="underline"
        tabs={tabs}
        activeValue={activeValue}
        matchMode="exact"
      />
    </div>
  )
}