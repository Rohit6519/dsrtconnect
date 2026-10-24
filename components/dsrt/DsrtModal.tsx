'use client'
import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useBreakpoint } from '@/hooks/useBreakpoint'

interface DsrtModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  /** Size on desktop — mobile is always full-screen */
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** Force full-screen even on desktop */
  fullScreen?: boolean
  className?: string
  contentClassName?: string
}

const sizeMap = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-2xl',
}

/**
 * DSRT Modal — mobile-first responsive modal.
 * Mobile: full-screen sheet from bottom.
 * Desktop: centered modal.
 */
export function DsrtModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = 'md',
  fullScreen = false,
  className,
  contentClassName,
}: DsrtModalProps) {
  const { isMobile } = useBreakpoint()
  const shouldFullScreen = fullScreen || isMobile

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        />
        <DialogPrimitive.Content
          className={cn(
            'fixed z-50 flex flex-col bg-gradient-to-b from-[#0f172a] to-[#0a0f1a] text-white border border-white/[0.08] shadow-2xl',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            shouldFullScreen
              ? 'inset-0 sm:inset-auto sm:top-[50%] sm:left-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:w-full sm:max-h-[90vh] sm:rounded-2xl data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95 sm:data-[state=closed]:slide-out-to-bottom-0 sm:data-[state=open]:slide-in-from-bottom-0'
              : 'top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-[calc(100%-2rem)] max-h-[90vh] rounded-2xl data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            !shouldFullScreen && sizeMap[size],
            className
          )}
        >
          {(title || description) && (
            <header className="flex items-start justify-between gap-4 p-5 border-b border-white/[0.06] flex-shrink-0">
              <div className="min-w-0">
                {title && (
                  <DialogPrimitive.Title className="text-[16px] font-semibold text-white tracking-tight">
                    {title}
                  </DialogPrimitive.Title>
                )}
                {description && (
                  <DialogPrimitive.Description className="mt-1 text-[13px] text-white/50">
                    {description}
                  </DialogPrimitive.Description>
                )}
              </div>
              <DialogPrimitive.Close className="p-1.5 -mr-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors flex-shrink-0">
                <X className="w-4 h-4" />
                <span className="sr-only">Close</span>
              </DialogPrimitive.Close>
            </header>
          )}

          <div className={cn('flex-1 overflow-y-auto p-5', contentClassName)}>
            {children}
          </div>

          {footer && (
            <footer className="flex items-center justify-end gap-2 p-4 border-t border-white/[0.06] flex-shrink-0 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-4">
              {footer}
            </footer>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}