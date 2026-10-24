'use client'

import { useState, useEffect, useRef } from 'react'
import {
  TextT, TextHOne, TextHTwo, TextHThree,
  ListBullets, ListNumbers, Quotes, Code, Minus,
} from '@phosphor-icons/react'

export interface SlashCommand {
  id: string
  label: string
  description: string
  Icon: any
  keywords: string[]
}

const COMMANDS: SlashCommand[] = [
  { id: 'paragraph', label: 'Text', description: 'Just start writing.', Icon: TextT, keywords: ['text', 'paragraph', 'para'] },
  { id: 'heading1', label: 'Heading 1', description: 'Big section heading.', Icon: TextHOne, keywords: ['heading', 'h1', 'title'] },
  { id: 'heading2', label: 'Heading 2', description: 'Medium heading.', Icon: TextHTwo, keywords: ['heading', 'h2', 'subheading'] },
  { id: 'heading3', label: 'Heading 3', description: 'Small heading.', Icon: TextHThree, keywords: ['heading', 'h3'] },
  { id: 'bullet', label: 'Bulleted list', description: 'Simple bullets.', Icon: ListBullets, keywords: ['list', 'bullet'] },
  { id: 'numbered', label: 'Numbered list', description: 'Ordered list.', Icon: ListNumbers, keywords: ['list', 'ordered', 'numbered'] },
  { id: 'quote', label: 'Quote', description: 'Capture a quote.', Icon: Quotes, keywords: ['quote'] },
  { id: 'code', label: 'Code', description: 'Code snippet.', Icon: Code, keywords: ['code', 'snippet'] },
  { id: 'divider', label: 'Divider', description: 'Visual break.', Icon: Minus, keywords: ['divider', 'hr', 'break'] },
]

interface Props {
  search: string
  position: { x: number; y: number }
  onSelect: (cmd: SlashCommand) => void
  onClose: () => void
}

export function ComposerSlashMenu({ search, position, onSelect, onClose }: Props) {
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [query, setQuery] = useState(search)
  const ref = useRef<HTMLDivElement>(null)

  const filtered = query
    ? COMMANDS.filter(c => {
        const q = query.toLowerCase()
        return c.label.toLowerCase().includes(q) || c.keywords.some(k => k.includes(q))
      })
    : COMMANDS

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIdx(i => Math.min(i + 1, filtered.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIdx(i => Math.max(0, i - 1))
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        const cmd = filtered[selectedIdx]
        if (cmd) onSelect(cmd)
      } else if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'Backspace') {
        setQuery(q => q.slice(0, -1))
        if (!query) onClose()
      } else if (e.key.length === 1) {
        setQuery(q => q + e.key)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [filtered, selectedIdx, onSelect, onClose, query])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    window.addEventListener('click', handler)
    return () => window.removeEventListener('click', handler)
  }, [onClose])

  if (filtered.length === 0) return null

  return (
    <div
      ref={ref}
      className="fixed z-[60] w-72 rounded-lg border border-zinc-800 bg-[#0f0f0f] shadow-[0_12px_48px_rgba(0,0,0,0.7)] overflow-hidden"
      style={{ left: position.x, top: position.y }}
    >
      <div className="px-3 py-2 border-b border-zinc-800 bg-zinc-950/50">
        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
          {query ? `Filter: /${query}` : 'Blocks'}
        </span>
      </div>
      <div className="max-h-72 overflow-y-auto py-1">
        {filtered.map((cmd, i) => {
          const isSelected = i === selectedIdx
          return (
            <button
              key={cmd.id}
              onClick={() => onSelect(cmd)}
              onMouseEnter={() => setSelectedIdx(i)}
              className={
                'w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ' +
                (isSelected ? 'bg-zinc-900' : 'hover:bg-zinc-900/50')
              }
            >
              <div className="w-8 h-8 rounded-md bg-zinc-950 border border-zinc-800 flex items-center justify-center shrink-0">
                <cmd.Icon size={13} weight="regular" className="text-zinc-300" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12.5px] font-semibold text-zinc-100">{cmd.label}</div>
                <div className="text-[11px] text-zinc-500 truncate">{cmd.description}</div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}