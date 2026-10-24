// filepath: components/mail/MailMobileDrawer.tsx
'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import Image from 'next/image'

interface Props {
  open: boolean
  onClose: () => void
  children: React.ReactNode
}

/**
 * Enterprise mobile drawer — 320px left slide-in with dimmed backdrop.
 * Purpose-built for DSRT Mail. Not a full-screen sheet.
 */
export function MailMobileDrawer({ open, onClose, children }: Props) {
  useEffect(() => {
    if (!open) return
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-[80] lg:hidden',
        open ? 'pointer-events-auto' : 'pointer-events-none'
      )}
      aria-hidden={!open}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={cn(
          'absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300',
          open ? 'opacity-100' : 'opacity-0'
        )}
      />

      {/* Drawer panel */}
      <aside
        className={cn(
          'absolute top-0 bottom-0 left-0 w-[300px] max-w-[85vw]',
          'flex flex-col overflow-hidden',
          'bg-gradient-to-b from-[#0B0E17] via-[#0A0C15] to-[#080A11]',
          'border-r border-white/[0.08]',
          'shadow-[8px_0_40px_rgba(0,0,0,0.6)]',
          'transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        {/* Drawer header */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center">
              <Image
                src="/dsrt-mail-icon.png"
                alt="DSRT Mail"
                width={32}
                height={32}
                className="w-8 h-8 object-contain"
              />
            </div>
            <h2 className="text-[15px] font-bold text-white tracking-tight">
              DSRT <span className="text-white/50 font-medium">Mail</span>
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-white/[0.06] text-white/60 hover:text-white flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" weight="bold" />
          </button>
        </div>

        {/* Drawer body */}
        <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>
      </aside>
    </div>,
    document.body
  )
}