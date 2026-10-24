'use client'
import Link from 'next/link'
import { dsrtNavigation } from './navConfig'
import { useActiveNav } from '@/hooks/useActiveNav'
import { cn } from '@/lib/utils'

export function TopPrimaryNav({ badges }: { badges: any }) {
  const { activePrimary } = useActiveNav()

  return (
    <div className="w-full bg-[#05070D] border-b border-white/[0.06]">
      <div className="max-w-[1600px] mx-auto px-4 md:px-6">
        <nav className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-2 md:py-3">
          {dsrtNavigation.map((item) => {
            const isActive = activePrimary?.id === item.id
            const Icon = item.icon
            const badgeCount = item.badgeKey ? badges[item.badgeKey] : 0

            return (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 px-3.5 py-2 rounded-full whitespace-nowrap transition-all select-none',
                  isActive 
                    ? 'bg-gradient-to-b from-[#1e3a5f] to-[#2c5282] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] border border-[#2c5282]/50'
                    : 'text-white/60 hover:text-white hover:bg-white/[0.04] border border-transparent'
                )}
              >
                <Icon className={cn("w-4 h-4", item.id === 'coco' ? 'fallback-coco flex items-center justify-center font-bold text-xs' : '')}>
                  {item.id === 'coco' ? 'C' : ''}
                </Icon>
                <span className="text-[13px] font-medium tracking-wide">{item.label}</span>
                {badgeCount > 0 && (
                  <span className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500 text-white leading-none">
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}