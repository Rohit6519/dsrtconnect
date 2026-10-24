'use client'

import { useEffect, useState } from 'react'
import { toast as sonnerToast } from 'sonner'
import { cn } from '@/lib/utils'

type ToastItem = {
  id: string
  title: string
  tone: 'default' | 'success' | 'error'
}

let pushToast: ((title: string, tone?: ToastItem['tone']) => void) | null = null

function emit(title: string, tone: ToastItem['tone'] = 'default') {
  if (pushToast) {
    pushToast(title, tone)
    return
  }
  // fallback if Toaster not mounted yet
  try {
    sonnerToast(title)
  } catch {
    // ignore
  }
}

export const toast = Object.assign(
  (title: string) => emit(String(title), 'default'),
  {
    success: (title: string) => emit(String(title), 'success'),
    error: (title: string) => emit(String(title), 'error'),
    message: (title: string) => emit(String(title), 'default'),
    dismiss: (_id?: string) => {},
  }
)

export function Toaster({
  theme = 'dark',
  className,
  ..._props
}: {
  theme?: 'light' | 'dark' | 'system'
  className?: string
  [key: string]: any
}) {
  const [items, setItems] = useState<ToastItem[]>([])

  useEffect(() => {
    pushToast = (title: string, tone: ToastItem['tone'] = 'default') => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      setItems((prev) => [...prev, { id, title, tone }].slice(-4))
      window.setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== id))
      }, 3200)
    }
    return () => {
      pushToast = null
    }
  }, [])

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-[9999] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2 pointer-events-none',
        className
      )}
      data-theme={theme}
      aria-live="polite"
    >
      {items.map((item) => (
        <div
          key={item.id}
          className={cn(
            'pointer-events-auto rounded-lg border px-3 py-2 text-[13px] shadow-2xl backdrop-blur-md',
            'bg-[#0A0D14] text-white border-white/[0.08]',
            item.tone === 'success' && 'border-emerald-500/30',
            item.tone === 'error' && 'border-red-500/30'
          )}
        >
          {item.title}
        </div>
      ))}
    </div>
  )
}

export default Toaster