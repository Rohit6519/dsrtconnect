'use client'

import { useState, useEffect, useRef } from 'react'
import {
  TextT, TextHOne, TextHTwo, TextHThree, ListBullets, ListNumbers,
  ListChecks, Quotes, Code, Minus, Image as ImageIcon,
} from '@phosphor-icons/react'

export interface SlashCommand {
  id: string
  label: string
  description: string
  blockType: any
  icon: any
  keywords: string[]
}

const COMMANDS: SlashCommand[] = [
  { id: 'text', label: 'Text', description: 'Just start writing.', blockType: 'paragraph', icon: TextT, keywords: ['text', 'paragraph', 'para'] },
  { id: 'h1', label: 'Heading 1', description: 'Large section heading.', blockType: 'heading1', icon: TextHOne, keywords: ['heading', 'h1', 'title'] },
  { id: 'h2', label: 'Heading 2', description: 'Medium section heading.', blockType: 'heading2', icon: TextHTwo, keywords: ['heading', 'h2', 'subtitle'] },
  { id: 'h3', label: 'Heading 3', description: 'Small section heading.', blockType: 'heading3', icon: TextHThree, keywords: ['heading', 'h3'] },
  { id: 'bullet', label: 'Bulleted list', description: 'Simple bullet list.', blockType: 'bulleted-list', icon: ListBullets, keywords: ['list', 'bullet', 'unordered'] },
  { id: 'numbered', label: 'Numbered list', description: 'Ordered list with numbers.', blockType: 'numbered-list', icon: ListNumbers, keywords: ['list', 'numbered', 'ordered'] },
  { id: 'checklist', label: 'To-do list', description: 'Task list with checkboxes.', blockType: 'checklist', icon: ListChecks, keywords: ['todo', 'checklist', 'task'] },
  { id: 'quote', label: 'Quote', description: 'Capture a quote.', blockType: 'quote', icon: Quotes, keywords: ['quote', 'blockquote'] },
  { id: 'code', label: 'Code', description: 'Code snippet.', blockType: 'code', icon: Code, keywords: ['code', 'snippet'] },
  { id: 'divider', label: 'Divider', description: 'Visual divider.', blockType: 'divider', icon: Minus, keywords: ['divider', 'separator', 'hr'] },
  { id: 'image', label: 'Image', description: 'Upload or embed an image.', blockType: 'image', icon: ImageIcon, keywords: ['image', 'picture', 'photo'] },
]

interface Props {
  search: string
  position: { x: number; y: number }
  onSelect: (cmd: SlashCommand) => void
  onClose: () => void
}

export function SlashMenu({ search, position, onSelect, onClose }: Props) {
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [query, setQuery] = useState(search)
  const menuRef = useRef<HTMLDivElement>(null)

  const filtered = COMMANDS.filter(cmd => {
    if (!query) return true
    const q = query.toLowerCase().replace('/', '')
    return cmd.label.toLowerCase().includes(q)
      || cmd.keywords.some(k => k.includes(q))
  })

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIdx(i => Math.min(i + 1, filtered.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIdx(i => Math.max(0, i - 1))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const cmd = filtered[selectedIdx]
        if (cmd) onSelect(cmd)
      } else if (e.key === 'Escape') {
        onClose()
      } else if (e.key.length === 1) {
        setQuery(q => q + e.key)
      } else if (e.key === 'Backspace') {
        setQuery(q => q.slice(0, -1))
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [filtered, selectedIdx, onSelect, onClose])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose()
    }
    window.addEventListener('click', handler)
    return () => window.removeEventListener('click', handler)
  }, [onClose])

  if (filtered.length === 0) return null

  return (
    <div
      ref={menuRef}
      className="fixed z-50 w-72 rounded-lg border border-zinc-800 bg-[#0f0f0f] shadow-[0_12px_48px_rgba(0,0,0,0.7)] overflow-hidden"
      style={{ left: position.x, top: position.y }}
    >
      <div className="px-3 py-2 border-b border-zinc-800 bg-zinc-950/50">
        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
          {query ? `Filter: /${query}` : 'Basic blocks'}
        </span>
      </div>
      <div className="max-h-72 overflow-y-auto py-1">
        {filtered.map((cmd, i) => {
          const Icon = cmd.icon
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
                <Icon size={14} weight="regular" className="text-zinc-300" />
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