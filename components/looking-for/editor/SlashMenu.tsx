'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Editor } from '@tiptap/react'
import {
  TextT, TextHOne, TextHTwo, ListBullets, ListNumbers, ListChecks,
  Quotes, Code, Minus, Image as ImageIcon, VideoCamera,
  Target, ClipboardText, ShieldCheck, Sparkle, CurrencyDollar,
  Clock, UsersThree, ArrowsClockwise,
} from '@phosphor-icons/react'

interface Command {
  key: string
  label: string
  hint?: string
  Icon: any
  group: 'text' | 'media' | 'opportunity'
  action: (editor: Editor) => void
}

const COMMANDS: Command[] = [
  { key: 'text',        label: 'Text',           group: 'text',  Icon: TextT,        action: (e) => e.chain().focus().setParagraph().run() },
  { key: 'h2',          label: 'Heading',        group: 'text',  Icon: TextHOne,     action: (e) => e.chain().focus().toggleHeading({ level: 2 }).run() },
  { key: 'h3',          label: 'Subheading',     group: 'text',  Icon: TextHTwo,     action: (e) => e.chain().focus().toggleHeading({ level: 3 }).run() },
  { key: 'bullet',      label: 'Bullet list',    group: 'text',  Icon: ListBullets,  action: (e) => e.chain().focus().toggleBulletList().run() },
  { key: 'numbered',    label: 'Numbered list',  group: 'text',  Icon: ListNumbers,  action: (e) => e.chain().focus().toggleOrderedList().run() },
  { key: 'checklist',   label: 'Checklist',      group: 'text',  Icon: ListChecks,   action: (e) => e.chain().focus().toggleTaskList().run() },
  { key: 'quote',       label: 'Quote',          group: 'text',  Icon: Quotes,       action: (e) => e.chain().focus().toggleBlockquote().run() },
  { key: 'code',        label: 'Code block',     group: 'text',  Icon: Code,         action: (e) => e.chain().focus().toggleCodeBlock().run() },
  { key: 'divider',     label: 'Divider',        group: 'text',  Icon: Minus,        action: (e) => e.chain().focus().setHorizontalRule().run() },

  { key: 'image',       label: 'Image',          group: 'media', Icon: ImageIcon,    action: (e) => {
    const url = window.prompt('Image URL')
    if (url) e.chain().focus().setImage({ src: url }).run()
  }},
  { key: 'video',       label: 'YouTube video',  group: 'media', Icon: VideoCamera,  action: (e) => {
    const url = window.prompt('YouTube URL')
    if (url) e.chain().focus().setYoutubeVideo({ src: url }).run()
  }},

  { key: 'op_build',    label: "What you'll build", hint: 'Impact and scope',         group: 'opportunity', Icon: Target,        action: (e) => insertBlock(e, "What you'll build") },
  { key: 'op_resp',     label: 'Responsibilities',  hint: 'Ownership areas',          group: 'opportunity', Icon: ClipboardText, action: (e) => insertBlock(e, 'Responsibilities') },
  { key: 'op_req',      label: 'Requirements',      hint: 'Must have',                group: 'opportunity', Icon: ShieldCheck,   action: (e) => insertBlock(e, 'Requirements') },
  { key: 'op_nice',     label: 'Nice to have',      hint: 'Bonus skills',             group: 'opportunity', Icon: Sparkle,       action: (e) => insertBlock(e, 'Nice to have') },
  { key: 'op_comp',     label: 'Compensation',      hint: 'Salary, equity, benefits', group: 'opportunity', Icon: CurrencyDollar, action: (e) => insertBlock(e, 'Compensation') },
  { key: 'op_commit',   label: 'Commitment',        hint: 'Time and duration',        group: 'opportunity', Icon: Clock,         action: (e) => insertBlock(e, 'Commitment') },
  { key: 'op_team',     label: 'Team',              hint: "Who you'll work with",     group: 'opportunity', Icon: UsersThree,    action: (e) => insertBlock(e, 'Team') },
  { key: 'op_apply',    label: 'Application process', hint: 'How people can apply',   group: 'opportunity', Icon: ArrowsClockwise, action: (e) => insertBlock(e, 'Application process') },
]

function insertBlock(editor: Editor, title: string) {
  editor.chain().focus()
    .setNode('heading', { level: 2 })
    .insertContent(title)
    .createParagraphNear()
    .createParagraphNear()
    .run()
}

interface Props {
  editor: Editor
}

export function SlashMenu({ editor }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const menuRef = useRef<HTMLDivElement>(null)

  const filtered = COMMANDS.filter(c => {
    if (!query) return true
    const q = query.toLowerCase()
    return c.label.toLowerCase().includes(q) || c.key.toLowerCase().includes(q)
  })

  useEffect(() => {
    if (!editor) return

    const handler = () => {
      const { state } = editor
      const { $from } = state.selection
      const textBefore = $from.parent.textBetween(0, $from.parentOffset, undefined, '\ufffc')
      const slashMatch = textBefore.match(/(?:^|\s)\/([a-z]*)$/i)

      if (slashMatch) {
        setQuery(slashMatch[1])
        setSelectedIndex(0)
        setOpen(true)

        const view = editor.view
        const pos = view.coordsAtPos($from.pos)
        const MENU_H = 380
        const MENU_W = 288
        const vp_h = window.innerHeight
        const vp_w = window.innerWidth

        let top = pos.bottom + 8
        if (top + MENU_H > vp_h - 20) {
          top = pos.top - MENU_H - 8
        }
        let left = pos.left
        if (left + MENU_W > vp_w - 20) {
          left = vp_w - MENU_W - 20
        }
        if (left < 20) left = 20

        setPosition({ top, left })
      } else if (open) {
        setOpen(false)
        setQuery('')
      }
    }

    editor.on('selectionUpdate', handler)
    editor.on('update', handler)
    return () => {
      editor.off('selectionUpdate', handler)
      editor.off('update', handler)
    }
  }, [editor, open])

  const removeSlash = useCallback(() => {
    if (!editor) return
    const { state } = editor
    const { $from } = state.selection
    const textBefore = $from.parent.textBetween(0, $from.parentOffset, undefined, '\ufffc')
    const slashMatch = textBefore.match(/(?:^|\s)\/([a-z]*)$/i)
    if (slashMatch) {
      const start = $from.pos - slashMatch[0].trimStart().length
      editor.chain().focus().deleteRange({ from: start, to: $from.pos }).run()
    }
  }, [editor])

  const runCommand = useCallback((cmd: Command) => {
    removeSlash()
    cmd.action(editor)
    setOpen(false)
    setQuery('')
  }, [editor, removeSlash])

  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(i => Math.min(filtered.length - 1, i + 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(i => Math.max(0, i - 1))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (filtered[selectedIndex]) runCommand(filtered[selectedIndex])
      } else if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, filtered, selectedIndex, runCommand])

  useEffect(() => {
    if (!open) return
    const onScroll = () => setOpen(false)
    window.addEventListener('scroll', onScroll, true)
    return () => window.removeEventListener('scroll', onScroll, true)
  }, [open])

  const grouped = {
    text: filtered.filter(c => c.group === 'text'),
    media: filtered.filter(c => c.group === 'media'),
    opportunity: filtered.filter(c => c.group === 'opportunity'),
  }

  if (!open || !position) return null
  let runningIndex = 0

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        width: 288,
        maxHeight: 380,
      }}
      className="z-50 rounded-lg border border-zinc-800 bg-[#0a0a0a] shadow-2xl overflow-hidden flex flex-col"
    >
      <div className="px-3 py-2 border-b border-zinc-800/80 bg-zinc-950">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
          Insert block {query && <span className="text-zinc-400 normal-case tracking-normal ml-1">— "{query}"</span>}
        </div>
      </div>
      <div className="overflow-y-auto py-1 flex-1">
        {filtered.length === 0 && (
          <div className="px-4 py-6 text-center text-[12px] text-zinc-500">
            No matching blocks
          </div>
        )}

        {Object.entries(grouped).map(([groupKey, items]) => {
          if (items.length === 0) return null
          const groupLabel = groupKey === 'text' ? 'Text' : groupKey === 'media' ? 'Media' : 'Opportunity blocks'
          return (
            <div key={groupKey} className="border-b border-zinc-800/60 last:border-b-0 py-1">
              <div className="px-3 pt-1 pb-0.5 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-zinc-600">
                {groupLabel}
              </div>
              {items.map(cmd => {
                const currentIndex = runningIndex++
                const isSelected = currentIndex === selectedIndex
                return (
                  <button
                    key={cmd.key}
                    type="button"
                    onMouseEnter={() => setSelectedIndex(currentIndex)}
                    onClick={() => runCommand(cmd)}
                    className={
                      'w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ' +
                      (isSelected ? 'bg-zinc-900' : 'hover:bg-zinc-900/60')
                    }
                  >
                    <div className={
                      'w-7 h-7 rounded-md flex items-center justify-center shrink-0 ' +
                      (isSelected ? 'bg-zinc-800 text-white' : 'bg-zinc-900 text-zinc-400')
                    }>
                      <cmd.Icon size={13} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[12.5px] text-zinc-200">{cmd.label}</div>
                      {cmd.hint && (
                        <div className="text-[10.5px] text-zinc-500">{cmd.hint}</div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>
      <div className="px-3 py-1.5 border-t border-zinc-800/80 bg-zinc-950 text-[10px] text-zinc-600">
        ↑↓ navigate · ↵ select · esc close
      </div>
    </div>
  )
}
