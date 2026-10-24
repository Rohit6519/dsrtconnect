'use client'
import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { cn } from '@/lib/utils'

interface DsrtSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  children: React.ReactNode
  footer?: React.ReactNode
  /** Bottom sheet snap height */
  snap?: 'auto' | 'half' | 'full'
  className?: string
}

const snapMap = {
  auto: 'max-h-[85vh]',
  half: 'h-[50vh]',
  full: 'h-[95vh]',
}

/**
 * DSRT Sheet — bottom sheet for mobile actions/filters/pickers.
 * Slides up from bottom on all screen sizes.
 */
export function DsrtSheet({
  open,
  onOpenChange,
  title,
  children,
  footer,
  snap = 'auto',
  className,
}: DsrtSheetProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        />
        <DialogPrimitive.Content
          className={cn(
            'fixed z-50 bottom-0 left-0 right-0 flex flex-col bg-gradient-to-b from-[#0f172a] to-[#0a0f1a] text-white border-t border-white/[0.08] rounded-t-2xl shadow-2xl',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
            snapMap[snap],
            className
          )}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-2 pb-1 flex-shrink-0">
            <div className="w-10 h-1 rounded-full bg-white/20" />
          </div>

          {title && (
            <header className="px-5 pb-3 flex-shrink-0">
              <DialogPrimitive.Title className="text-[15px] font-semibold text-white tracking-tight">
                {title}
              </DialogPrimitive.Title>
            </header>
          )}

          <div className="flex-1 overflow-y-auto px-5 pb-5">{children}</div>

          {footer && (
            <footer className="flex items-center justify-end gap-2 p-4 border-t border-white/[0.06] flex-shrink-0 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              {footer}
            </footer>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}