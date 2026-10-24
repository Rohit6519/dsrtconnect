'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from '@phosphor-icons/react'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  footer?: React.ReactNode
  children: React.ReactNode
  wide?: boolean
}

/**
 * Right-side drawer (portalled so parent overflow can never clip it).
 * Same dark chrome as the rest of DSRT — no restyle.
 */
export function DrawerShell({ open, onClose, title, subtitle, footer, children, wide }: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null
  if (typeof window === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex" role="dialog" aria-modal="true">
      <div className="flex-1 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <aside
        className={
          'h-full bg-[#0c0d10] border-l border-zinc-800/80 shadow-[0_20px_80px_rgba(0,0,0,0.8)] flex flex-col ' +
          (wide ? 'w-full max-w-[720px]' : 'w-full max-w-[520px]')
        }
      >
        <header className="px-6 py-4 border-b border-zinc-800/80 bg-[#090a0c] flex items-start gap-3 shrink-0">
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-bold text-white tracking-tight leading-tight">{title}</div>
            {subtitle && (
              <div className="text-[11.5px] text-zinc-500 mt-0.5 leading-snug">{subtitle}</div>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-900 transition-colors shrink-0"
            aria-label="Close"
          >
            <X size={14} weight="bold" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6">{children}</div>

        {footer && (
          <footer className="px-6 py-4 border-t border-zinc-800/80 bg-[#090a0c] shrink-0">
            {footer}
          </footer>
        )}
      </aside>
    </div>,
    document.body,
  )
}