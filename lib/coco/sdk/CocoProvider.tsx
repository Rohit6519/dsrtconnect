// ============================================================
// lib/coco/sdk/CocoProvider.tsx
// Root provider. Mounts the launcher + panel globally.
// ============================================================

'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import { CocoLauncher } from '@/components/coco/CocoLauncher'
import { CocoPanel } from '@/components/coco/CocoPanel'

interface CocoUiContext {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
}

const Ctx = createContext<CocoUiContext | null>(null)

export function useCocoUi() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useCocoUi must be used within CocoProvider')
  return ctx
}

export function CocoProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  const value: CocoUiContext = {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen(prev => !prev)
  }

  return (
    <Ctx.Provider value={value}>
      {children}
      <CocoLauncher />
      <CocoPanel />
    </Ctx.Provider>
  )
}