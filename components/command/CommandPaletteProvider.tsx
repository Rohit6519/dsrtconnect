'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { AnimatePresence } from 'framer-motion'
import { CommandPalette } from './CommandPalette'

interface CommandContextType {
  open: boolean
  setOpen: (open: boolean) => void
  toggle: () => void
}

const CommandContext = createContext<CommandContextType | null>(null)

export function useCommandPalette() {
  const context = useContext(CommandContext)
  if (!context) {
    throw new Error('useCommandPalette must be used within CommandPaletteProvider')
  }
  return context
}

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)

  const toggle = () => setOpen(prev => !prev)

  // Global keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Cmd+K on Mac, Ctrl+K on Windows/Linux
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        toggle()
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <CommandContext.Provider value={{ open, setOpen, toggle }}>
      {children}
      <AnimatePresence>
        {open && <CommandPalette open={open} onClose={() => setOpen(false)} />}
      </AnimatePresence>
    </CommandContext.Provider>
  )
}