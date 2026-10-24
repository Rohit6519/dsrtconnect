'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useEffect, useRef } from 'react'

export interface DsrtTabItem {
  label: string
  href?: string
  value?: string
  badge?: number | string
  disabled?: boolean
}

interface DsrtTabsProps {
  tabs: DsrtTabItem[]
  className?: string
  /** Style variant */
  variant?: 'underline' | 'pill' | 'segmented'
  /** For controlled state (non-link mode) */
  activeValue?: string
  onValueChange?: (value: string) => void
  /** Match mode for link tabs */
  matchMode?: 'exact' | 'prefix'
}

/**
 * DSRT Tabs — horizontal scrollable tabs.
 * Auto-scrolls active tab into view on mobile.
 * Supports link mode (href) or controlled mode (value).
 */
export function DsrtTabs({
  tabs,
  className,
  variant = 'underline',
  activeValue,
  onValueChange,
  matchMode = 'exact',
}: DsrtTabsProps) {
  const pathname = usePathname()
  const scrollerRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLAnchorElement | HTMLButtonElement | null>(null)

  const isActive = (tab: DsrtTabItem): boolean => {
    if (tab.href) {
      return matchMode === 'exact'
        ? pathname === tab.href
        : pathname === tab.href || pathname.startsWith(tab.href + '/')
    }
    return tab.value === activeValue
  }

  // Auto-scroll active tab into view on mount + route change
  useEffect(() => {
    if (activeRef.current && scrollerRef.current) {
      const scroller = scrollerRef.current
      const el = activeRef.current
      const scrollerRect = scroller.getBoundingClientRect()
      const elRect = el.getBoundingClientRect()
      if (elRect.left < scrollerRect.left || elRect.right > scrollerRect.right) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
      }
    }
  }, [pathname, activeValue])

  return (
    <div
      ref={scrollerRef}
      className={cn(
        'flex items-center overflow-x-auto scrollbar-hide',
        variant === 'underline' && 'gap-1 border-b border-white/[0.06]',
        variant === 'pill' && 'gap-1.5',
        variant === 'segmented' &&
          'gap-0.5 bg-white/[0.03] border border-white/[0.06] rounded-full p-1',
        className
      )}
    >
      {tabs.map((tab, i) => {
        const active = isActive(tab)
        const commonClasses = cn(
          'relative whitespace-nowrap font-medium transition-all select-none flex items-center gap-1.5',
          tab.disabled && 'opacity-40 pointer-events-none',
          // UNDERLINE
          variant === 'underline' && [
            'px-3 py-2.5 sm:px-4 sm:py-3 text-[12px] sm:text-[13px]',
            active ? 'text-white' : 'text-white/50 hover:text-white/80',
          ],
          // PILL
          variant === 'pill' && [
            'px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-full text-[12px] sm:text-[13px] border',
            active
              ? 'bg-gradient-to-b from-[#1e3a5f] to-[#2c5282] text-white border-[#2c5282]/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]'
              : 'text-white/60 hover:text-white hover:bg-white/[0.04] border-transparent',
          ],
          // SEGMENTED
          variant === 'segmented' && [
            'px-3 py-1.5 rounded-full text-[11px] sm:text-[12px] font-mono uppercase tracking-wider',
            active
              ? 'bg-white/[0.08] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
              : 'text-white/50 hover:text-white/80',
          ]
        )

        const content = (
          <>
            {tab.label}
            {tab.badge !== undefined && tab.badge !== 0 && (
              <span
                className={cn(
                  'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full text-[10px] font-semibold leading-none',
                  active ? 'bg-white/15 text-white' : 'bg-white/[0.06] text-white/60'
                )}
              >
                {typeof tab.badge === 'number' && tab.badge > 99 ? '99+' : tab.badge}
              </span>
            )}
            {active && variant === 'underline' && (
              <span className="absolute left-0 right-0 -bottom-px h-[2px] bg-white" />
            )}
          </>
        )

        if (tab.href) {
          return (
            <Link
              key={i}
              href={tab.href}
              ref={active ? (activeRef as any) : undefined}
              className={commonClasses}
            >
              {content}
            </Link>
          )
        }
        return (
          <button
            key={i}
            type="button"
            ref={active ? (activeRef as any) : undefined}
            onClick={() => tab.value && onValueChange?.(tab.value)}
            className={commonClasses}
          >
            {content}
          </button>
        )
      })}
    </div>
  )
}