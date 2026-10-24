// filepath: components/mail/composer/ComposerModal.tsx
'use client'

import { useEffect } from 'react'
import { useComposer } from './ComposerContext'
import { ComposerCore } from './ComposerCore'
import { cn } from '@/lib/utils'

export function ComposerModal() {
  const { isOpen, isFullscreen, initialState, closeCompose, openCompose } = useComposer()

  // Lock body scroll when compose is open
  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [isOpen])

  // Escape to close
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeCompose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, closeCompose])

  // ============================================================
  // COCO INTEGRATION — allow COCO to open the composer programmatically
  // ============================================================
  useEffect(() => {
    const handleCocoOpen = (e: Event) => {
      const detail = (e as CustomEvent).detail || {}
      const state = detail?.initialState
      // Only pass object; if none provided, call with no args (satisfies types)
      if (state && typeof state === 'object') openCompose(state)
      else openCompose()
    }
    window.addEventListener('coco:mail:open-compose', handleCocoOpen as EventListener)
    return () => window.removeEventListener('coco:mail:open-compose', handleCocoOpen as EventListener)
  }, [openCompose])

  if (!isOpen) return null

  // ─── FULLSCREEN ───
  if (isFullscreen) {
    return (
      <div
        data-coco-mail-composer
        data-coco-composer-modal
        className={cn(
          'fixed inset-0 z-[150]',
          'bg-black/80 backdrop-blur-sm',
          'flex flex-col sm:items-center sm:justify-center p-0 sm:p-6'
        )}
      >
        <div
          className="w-full h-full sm:w-[900px] sm:max-w-[95vw] sm:h-[85vh] sm:rounded-2xl overflow-hidden shadow-2xl flex flex-col"
          style={{
            paddingTop: 'env(safe-area-inset-top)',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          <ComposerCore mode="full" initialState={initialState} />
        </div>
      </div>
    )
  }

  // ─── DOCKED / SHEET ───
  return (
    <div data-coco-mail-composer data-coco-composer-modal>
      {/* Mobile full-screen */}
      <div
        className="sm:hidden fixed inset-0 z-[150] bg-[#05070D] flex flex-col overflow-hidden"
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <ComposerCore mode="full" initialState={initialState} />
      </div>

      {/* Desktop bottom-right dock */}
      <div className="hidden sm:flex fixed bottom-0 right-6 z-[150] items-end pointer-events-none">
        <div
          className={cn(
            'w-[540px] max-h-[85vh] overflow-hidden pointer-events-auto flex flex-col',
            'rounded-t-2xl border border-white/[0.08] border-b-0',
            'shadow-[0_-8px_40px_rgba(0,0,0,0.55)]',
            'bg-gradient-to-b from-[#0F1219] to-[#0A0D14]'
          )}
        >
          <ComposerCore mode="quick" initialState={initialState} />
        </div>
      </div>
    </div>
  )
}