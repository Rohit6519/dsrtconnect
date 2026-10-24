'use client'

import { cn } from '@/lib/utils'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LucideIcon } from 'lucide-react'

export interface TabItem {
  label: string
  href: string
  icon?: LucideIcon
  badge?: number | string
  /** Match exactly or as a prefix */
  matchMode?: 'exact' | 'prefix'
}

interface TabsNavProps {
  tabs: TabItem[]
  className?: string
}

export function TabsNav({ tabs, className }: TabsNavProps) {
  const pathname = usePathname()

  const isActive = (tab: TabItem) => {
    if (tab.matchMode === 'exact') return pathname === tab.href
    return pathname === tab.href || pathname.startsWith(tab.href + '/')
  }

  return (
    <nav
      className={cn(
        'flex items-center gap-1 border-b border-white/[0.06] overflow-x-auto scrollbar-hide',
        className
      )}
    >
      {tabs.map((tab) => {
        const active = isActive(tab)
        const Icon = tab.icon
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'group relative flex items-center gap-2 px-4 py-3 text-[13px] font-medium transition-colors whitespace-nowrap',
              active
                ? 'text-white'
                : 'text-white/50 hover:text-white/80'
            )}
          >
            {Icon && <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />}
            {tab.label}
            {tab.badge !== undefined && tab.badge !== 0 && (
              <span
                className={cn(
                  'ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full text-[10px] font-semibold leading-none',
                  active
                    ? 'bg-white/15 text-white'
                    : 'bg-white/[0.06] text-white/60'
                )}
              >
                {typeof tab.badge === 'number' && tab.badge > 99 ? '99+' : tab.badge}
              </span>
            )}
            {active && (
              <span className="absolute left-0 right-0 -bottom-px h-px bg-white/80" />
            )}
          </Link>
        )
      })}
    </nav>
  )
}