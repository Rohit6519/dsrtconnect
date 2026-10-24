'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { name: 'DSRT', href: '/' },
  { name: 'Hackathons', href: '/hackathons' },
  { name: 'Developers', href: '/developers' },
  { name: 'Company', href: '/company' },
  { name: 'Social', href: '/social' },
]

export function PublicNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed top-4 left-4 md:top-6 md:left-8 z-50">
      <div className="flex items-center gap-1 px-2 py-1.5 rounded-full border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'px-3 md:px-4 py-1.5 text-[11px] md:text-xs font-semibold uppercase tracking-widest rounded-full transition-all',
                isActive
                  ? 'bg-white/10 text-white'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              )}
            >
              {item.name}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}