'use client'

import { useEffect } from 'react'

export interface Shortcut {
  keys: string           // e.g. 'mod+k', 'mod+s', 'esc', '/', 'j', 'k'
  handler: (e: KeyboardEvent) => void
  description?: string
  scope?: 'global' | 'editor' | 'list'
  preventDefault?: boolean
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform)

function matches(e: KeyboardEvent, keys: string): boolean {
  const parts = keys.toLowerCase().split('+').map(p => p.trim())
  const key = parts[parts.length - 1]
  const wantMod = parts.includes('mod')
  const wantShift = parts.includes('shift')
  const wantAlt = parts.includes('alt')

  const hasMod = isMac ? e.metaKey : e.ctrlKey
  if (wantMod !== hasMod) return false
  if (wantShift !== e.shiftKey) return false
  if (wantAlt !== e.altKey) return false

  if (key === 'esc') return e.key === 'Escape'
  if (key === 'enter') return e.key === 'Enter'
  if (key === 'space') return e.key === ' '
  return e.key.toLowerCase() === key
}

export function useShortcuts(shortcuts: Shortcut[], enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return

    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isEditable =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable

      for (const sc of shortcuts) {
        // Allow modifier-based shortcuts (mod+s, mod+k) even in inputs
        const hasModifier = sc.keys.toLowerCase().includes('mod') || sc.keys.toLowerCase().includes('shift') || sc.keys.toLowerCase() === 'esc'
        if (isEditable && !hasModifier) continue

        if (matches(e, sc.keys)) {
          if (sc.preventDefault !== false) e.preventDefault()
          sc.handler(e)
          return
        }
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [shortcuts, enabled])
}

export function keyLabel(keys: string): string {
  const mod = isMac ? '⌘' : 'Ctrl'
  return keys
    .split('+')
    .map(p => {
      const k = p.trim().toLowerCase()
      if (k === 'mod') return mod
      if (k === 'shift') return isMac ? '⇧' : 'Shift'
      if (k === 'alt') return isMac ? '⌥' : 'Alt'
      if (k === 'esc') return 'Esc'
      if (k === 'enter') return '↵'
      if (k === 'space') return 'Space'
      return k.toUpperCase()
    })
    .join(isMac ? '' : '+')
}
