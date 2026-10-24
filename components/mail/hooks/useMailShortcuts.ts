'use client'

import { useEffect } from 'react'

interface ShortcutConfig {
  onCompose: () => void
  onSearch: () => void
  onCommandPalette: () => void
  onArchive?: () => void
  onTrash?: () => void
  activeThreadId?: string | null
}

export function useMailShortcuts({ 
  onCompose, onSearch, onCommandPalette, onArchive, onTrash, activeThreadId 
}: ShortcutConfig) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isTyping = ['INPUT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable
      
      // Cmd/Ctrl+K — Command Palette (always active)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        onCommandPalette()
        return
      }

      // Cmd/Ctrl+Shift+C — Compose (safe, doesn't conflict with copy)
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'C') {
        e.preventDefault()
        onCompose()
        return
      }

      // If typing anywhere, don't handle single-key shortcuts
      if (isTyping) return

      // Single-key shortcuts (only when NOT typing)
      if (e.key === '/') {
        e.preventDefault()
        onSearch()
      } else if (activeThreadId) {
        if (e.key === 'e') {
          e.preventDefault()
          onArchive?.()
        } else if (e.key === '#') {
          e.preventDefault()
          onTrash?.()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onCompose, onSearch, onCommandPalette, onArchive, onTrash, activeThreadId])
}