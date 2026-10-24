'use client'

import { useEffect } from 'react'
import { X } from '@phosphor-icons/react'
import { keyLabel } from './useShortcuts'

interface ShortcutRow {
  keys: string
  description: string
  group: string
}

const SHORTCUTS: ShortcutRow[] = [
  { keys: 'mod+k',       description: 'Focus search',                 group: 'Navigation' },
  { keys: 'mod+/',       description: 'Show keyboard shortcuts',      group: 'Navigation' },
  { keys: 'esc',         description: 'Close modal / cancel',         group: 'Navigation' },

  { keys: 'mod+s',       description: 'Save draft',                   group: 'Editor' },
  { keys: 'mod+enter',   description: 'Publish opportunity',          group: 'Editor' },
  { keys: 'mod+p',       description: 'Preview',                      group: 'Editor' },
  { keys: '/',           description: 'Insert block (in editor)',     group: 'Editor' },
  { keys: 'mod+b',       description: 'Bold',                         group: 'Formatting' },
  { keys: 'mod+i',       description: 'Italic',                       group: 'Formatting' },
  { keys: 'mod+u',       description: 'Underline',                    group: 'Formatting' },
  { keys: 'mod+shift+7', description: 'Numbered list',                group: 'Formatting' },
  { keys: 'mod+shift+8', description: 'Bulleted list',                group: 'Formatting' },
]

interface Props {
  onClose: () => void
}

export function ShortcutsOverlay({ onClose }: Props) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', h)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const groups = SHORTCUTS.reduce<Record<string, ShortcutRow[]>>((acc, s) => {
    if (!acc[s.group]) acc[s.group] = []
    acc[s.group].push(s)
    return acc
  }, {})

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        role="dialog"
        aria-label="Keyboard shortcuts"
        className="relative w-full max-w-md rounded-xl border border-zinc-800 bg-[#0a0a0a] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h2 className="text-[15px] font-semibold text-white">Keyboard shortcuts</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-7 h-7 rounded-md flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-900"
          >
            <X size={14} weight="bold" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-5 space-y-5">
          {Object.entries(groups).map(([group, items]) => (
            <div key={group}>
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-zinc-500 mb-2">
                {group}
              </div>
              <div className="space-y-1">
                {items.map(s => (
                  <div key={s.keys} className="flex items-center justify-between py-1">
                    <span className="text-[13px] text-zinc-300">{s.description}</span>
                    <KeyBadge keys={s.keys} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function KeyBadge({ keys }: { keys: string }) {
  return (
    <kbd className="inline-flex items-center gap-1 px-2 h-6 rounded border border-zinc-700 bg-zinc-900 text-[11px] font-mono text-zinc-300">
      {keyLabel(keys)}
    </kbd>
  )
}
