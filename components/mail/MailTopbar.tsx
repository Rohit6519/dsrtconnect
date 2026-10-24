// filepath: components/mail/MailTopbar.tsx
'use client'

import { MagnifyingGlass, Sparkle, Gear, List, Command, X, Funnel } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { AccountSwitcher } from './AccountSwitcher'
import Link from 'next/link'
import Image from 'next/image'

interface Props {
  onToggleSidebar: () => void
  searchQ: string
  onSearchChange: (q: string) => void
  onToggleCoco: () => void
  cocoOpen: boolean
  searchOpen?: boolean
  onSearchOpenChange?: (open: boolean) => void
  onOpenFilters?: () => void
  filtersActive?: boolean
  compact?: boolean
}

export function MailTopbar({
  onToggleSidebar,
  searchQ,
  onSearchChange,
  onToggleCoco,
  cocoOpen,
  searchOpen = false,
  onSearchOpenChange,
  onOpenFilters,
  filtersActive = false,
  compact = false,
}: Props) {
  // ─── MOBILE COMPACT ───
  if (compact) {
    if (searchOpen) {
      return (
        <div className="flex items-center gap-2 w-full h-[52px] px-3 sm:px-4">
          <button
            onClick={() => {
              onSearchOpenChange?.(false)
              onSearchChange('')
            }}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/[0.06] shrink-0"
            aria-label="Close search"
          >
            <X className="w-5 h-5" weight="bold" />
          </button>

          <div className="relative flex-1">
            <MagnifyingGlass className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/45 pointer-events-none" />
            <input
              autoFocus
              value={searchQ}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search in emails"
              className={cn(
                'w-full h-[42px] pl-10 pr-10 rounded-full',
                'bg-white/[0.06] border border-white/[0.08]',
                'text-[14.5px] text-white placeholder:text-white/40',
                'focus:outline-none focus:border-[#4F7CFF]/50 focus:bg-white/[0.08]'
              )}
            />
            {searchQ && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
              >
                <X className="w-4 h-4" weight="bold" />
              </button>
            )}
          </div>

          <button
            onClick={onOpenFilters}
            className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors',
              filtersActive
                ? 'bg-[#4F7CFF]/20 text-[#93c5fd]'
                : 'text-white/60 hover:text-white hover:bg-white/[0.06]'
            )}
            aria-label="Filters"
          >
            <Funnel className="w-[18px] h-[18px]" weight={filtersActive ? 'duotone' : 'regular'} />
          </button>
        </div>
      )
    }

    return (
      <div className="flex items-center gap-2.5 w-full h-[52px] px-3 sm:px-4">
        <button
          onClick={onToggleSidebar}
          className="w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/[0.06] shrink-0 -ml-1"
          aria-label="Folders"
        >
          <List className="w-5 h-5" weight="bold" />
        </button>

        <button
          onClick={() => onSearchOpenChange?.(true)}
          className={cn(
            'flex-1 h-[42px] rounded-full px-4 flex items-center gap-3 text-left min-w-0',
            'bg-white/[0.05] border border-white/[0.07]',
            'active:bg-white/[0.09] hover:bg-white/[0.07] transition-colors'
          )}
        >
          <MagnifyingGlass className="w-[18px] h-[18px] text-white/45 shrink-0" />
          <span className="text-[14px] text-white/45 truncate font-medium">Search in emails</span>
        </button>

        <button
          onClick={onToggleCoco}
          className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors -mr-1',
            cocoOpen
              ? 'bg-[#4F7CFF]/20 text-[#93c5fd]'
              : 'text-white/60 hover:text-white hover:bg-white/[0.06]'
          )}
          aria-label="COCO"
        >
          <Sparkle className="w-[18px] h-[18px]" weight={cocoOpen ? 'duotone' : 'regular'} />
        </button>
      </div>
    )
  }

  // ─── DESKTOP ───
  return (
    <div
      className={cn(
        'h-[64px] flex items-center px-4 gap-4 flex-shrink-0 border-b border-white/[0.06]',
        'bg-gradient-to-b from-[#0D0E15] via-[#0B0C12] to-[#08090F]'
      )}
    >
      <div className="flex items-center gap-3 min-w-[220px]">
        <Link href="/inbox" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden">
            <Image
              src="/dsrt-mail-icon.png"
              alt="DSRT Mail"
              width={40}
              height={40}
              className="w-10 h-10 object-contain transition-transform group-hover:scale-[1.04]"
              priority
            />
          </div>
          <h1 className="text-[18px] font-bold text-white tracking-tight leading-none">
            DSRT <span className="text-white/50 font-medium">Mail</span>
          </h1>
        </Link>
      </div>

      <div className="flex-1 max-w-[560px] mx-auto">
        <div className="relative group">
          <MagnifyingGlass className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-white/70 transition-colors" />
          <input
            value={searchQ}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search in emails"
            className={cn(
              'w-full h-10 pl-10 pr-14 rounded-xl',
              'bg-white/[0.04] border border-white/[0.06]',
              'text-[13px] text-white placeholder:text-white/35',
              'focus:outline-none focus:border-[#4F7CFF]/40 focus:bg-white/[0.06]',
              'transition-all'
            )}
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/[0.05] border border-white/[0.08]">
            <Command className="w-2.5 h-2.5 text-white/45" weight="bold" />
            <span className="text-[9px] font-bold text-white/45">K</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 min-w-[180px] justify-end">
        <button
          onClick={onToggleCoco}
          className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center transition-all border',
            cocoOpen
              ? 'bg-[#4F7CFF]/15 border-[#4F7CFF]/30 text-[#93c5fd]'
              : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.12] text-white/60 hover:text-white'
          )}
          title="Ask COCO"
        >
          <Sparkle className="w-[18px] h-[18px]" weight={cocoOpen ? 'duotone' : 'regular'} />
        </button>

        <Link
          href="/inbox/settings"
          className="w-10 h-10 rounded-lg hover:bg-white/[0.06] text-white/60 hover:text-white flex items-center justify-center transition-colors border border-transparent hover:border-white/[0.06]"
          title="Settings"
        >
          <Gear className="w-[18px] h-[18px]" />
        </Link>

        <div className="w-px h-6 bg-white/[0.08] mx-1" />
        <AccountSwitcher />
      </div>
    </div>
  )
}