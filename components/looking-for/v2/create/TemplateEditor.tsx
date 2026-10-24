'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { SlashMenu, type SlashCommand } from './SlashMenu'
import { TextB, TextItalic, TextUnderline, TextStrikethrough, LinkSimple } from '@phosphor-icons/react'

interface Props {
  draft: any
  onUpdate: (patch: any) => void
}

export interface Block {
  id: string
  type: 'paragraph' | 'heading1' | 'heading2' | 'heading3' | 'bulleted-list' | 'numbered-list' | 'checklist' | 'quote' | 'code' | 'divider' | 'image' | 'video' | 'file'
  content?: string
  checked?: boolean
  url?: string
  caption?: string
  meta?: any
}

function genId() {
  return 'blk_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)
}

export function TemplateEditor({ draft, onUpdate }: Props) {
  const [blocks, setBlocks] = useState<Block[]>(() => {
    const raw = draft?.content_blocks
    if (Array.isArray(raw) && raw.length > 0) return raw
    return [{ id: genId(), type: 'paragraph', content: '' }]
  })

  const [title, setTitle] = useState(draft?.title || '')
  const [subtitle, setSubtitle] = useState(draft?.subtitle || '')

  const [activeBlockId, setActiveBlockId] = useState<string | null>(null)
  const [slashMenuOpen, setSlashMenuOpen] = useState(false)
  const [slashMenuPos, setSlashMenuPos] = useState<{ x: number; y: number } | null>(null)
  const [slashSearch, setSlashSearch] = useState('')

  // Sync back to draft (debounced via useAutosave)
  useEffect(() => {
    const text = blocks.map(b => b.content || '').join('\n\n')
    onUpdate({
      title: title.trim() || null,
      subtitle: subtitle.trim() || null,
      content_blocks: blocks,
      content_text: text,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks, title, subtitle])

  const updateBlock = useCallback((id: string, patch: Partial<Block>) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, ...patch } : b))
  }, [])

  const insertBlockAfter = useCallback((afterId: string, newBlock: Block) => {
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === afterId)
      if (idx === -1) return [...prev, newBlock]
      const next = [...prev]
      next.splice(idx + 1, 0, newBlock)
      return next
    })
  }, [])

  const removeBlock = useCallback((id: string) => {
    setBlocks(prev => {
      if (prev.length <= 1) return prev
      return prev.filter(b => b.id !== id)
    })
  }, [])

  const changeBlockType = useCallback((id: string, type: Block['type']) => {
    setBlocks(prev => prev.map(b =>
      b.id === id ? { ...b, type, content: type === 'divider' ? '' : (b.content || '') } : b
    ))
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent, blockId: string, block: Block) => {
    // Enter → create new block
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()

      // Empty list item → convert to paragraph
      if (
        (block.type === 'bulleted-list' || block.type === 'numbered-list' || block.type === 'checklist')
        && !block.content
      ) {
        changeBlockType(blockId, 'paragraph')
        return
      }

      const newBlock: Block = { id: genId(), type: 'paragraph', content: '' }
      // Preserve list type continuation
      if (block.type === 'bulleted-list' || block.type === 'numbered-list' || block.type === 'checklist') {
        newBlock.type = block.type
        if (block.type === 'checklist') newBlock.checked = false
      }
      insertBlockAfter(blockId, newBlock)
      setTimeout(() => {
        const el = document.querySelector(`[data-block-id="${newBlock.id}"] [contenteditable]`) as HTMLElement
        el?.focus()
      }, 10)
      return
    }

    // Backspace on empty block → delete + focus previous
    if (e.key === 'Backspace' && !block.content) {
      const idx = blocks.findIndex(b => b.id === blockId)
      if (idx > 0) {
        e.preventDefault()
        removeBlock(blockId)
        setTimeout(() => {
          const prevBlock = blocks[idx - 1]
          const el = document.querySelector(`[data-block-id="${prevBlock.id}"] [contenteditable]`) as HTMLElement
          if (el) {
            el.focus()
            const range = document.createRange()
            range.selectNodeContents(el)
            range.collapse(false)
            const sel = window.getSelection()
            sel?.removeAllRanges()
            sel?.addRange(range)
          }
        }, 10)
      }
      return
    }

    // "/" → open slash menu
    if (e.key === '/' && !block.content) {
      const target = e.target as HTMLElement
      const rect = target.getBoundingClientRect()
      setSlashMenuPos({ x: rect.left, y: rect.bottom + 4 })
      setActiveBlockId(blockId)
      setSlashSearch('')
      setSlashMenuOpen(true)
    }
  }, [blocks, insertBlockAfter, removeBlock, changeBlockType])

  const handleSlashCommand = useCallback((cmd: SlashCommand) => {
    if (!activeBlockId) return
    changeBlockType(activeBlockId, cmd.blockType)
    setSlashMenuOpen(false)
    setSlashMenuPos(null)
    setTimeout(() => {
      const el = document.querySelector(`[data-block-id="${activeBlockId}"] [contenteditable]`) as HTMLElement
      el?.focus()
    }, 10)
  }, [activeBlockId, changeBlockType])

  return (
    <div className="relative">
      {/* Title */}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Start with a clear title..."
        data-field="title"
        className="w-full bg-transparent text-[36px] md:text-[44px] font-bold text-white placeholder:text-zinc-700 focus:outline-none tracking-tight leading-[1.15] mb-3"
        maxLength={250}
      />

      {/* Subtitle */}
      <input
        type="text"
        value={subtitle}
        onChange={(e) => setSubtitle(e.target.value)}
        placeholder="Add a short line that explains why someone should care..."
        data-field="subtitle"
        className="w-full bg-transparent text-[17px] text-zinc-300 placeholder:text-zinc-600 focus:outline-none leading-relaxed mb-8"
        maxLength={500}
      />

      {/* Blocks */}
      <div className="space-y-1" data-field="content_blocks">
        {blocks.map(block => (
          <BlockView
            key={block.id}
            block={block}
            onUpdate={(patch) => updateBlock(block.id, patch)}
            onKeyDown={(e) => handleKeyDown(e, block.id, block)}
            onFocus={() => setActiveBlockId(block.id)}
          />
        ))}
      </div>

      {/* Empty prompt */}
      {blocks.length === 1 && !blocks[0].content && (
        <div className="mt-3 flex items-center gap-2 text-[12px] text-zinc-600">
          <kbd className="inline-flex items-center h-5 px-1.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] font-mono">
            /
          </kbd>
          <span>for commands · Type freely, use Enter for new block</span>
        </div>
      )}

      {/* Slash menu */}
      {slashMenuOpen && slashMenuPos && (
        <SlashMenu
          search={slashSearch}
          position={slashMenuPos}
          onSelect={handleSlashCommand}
          onClose={() => {
            setSlashMenuOpen(false)
            setSlashMenuPos(null)
          }}
        />
      )}

      {/* Floating text formatter (appears on text selection) */}
      <TextFormatToolbar />
    </div>
  )
}

// ─── Individual block renderer ───
function BlockView({
  block, onUpdate, onKeyDown, onFocus,
}: {
  block: Block
  onUpdate: (p: Partial<Block>) => void
  onKeyDown: (e: React.KeyboardEvent) => void
  onFocus: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  // Sync content on external change (but not on user edit to avoid caret jump)
  useEffect(() => {
    if (ref.current && ref.current.textContent !== (block.content || '')) {
      // Only update if value actually differs to preserve caret
      if (document.activeElement !== ref.current) {
        ref.current.textContent = block.content || ''
      }
    }
  }, [block.content])

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const target = e.currentTarget
    onUpdate({ content: target.textContent || '' })
  }

  const commonProps = {
    ref,
    contentEditable: true,
    suppressContentEditableWarning: true,
    onInput: handleInput,
    onKeyDown,
    onFocus,
    className: 'outline-none min-h-[1.5em]',
  }

  const wrapperClass = 'group flex items-start gap-2 py-1'

  switch (block.type) {
    case 'heading1':
      return (
        <div className={wrapperClass} data-block-id={block.id}>
          <div
            {...commonProps}
            className="outline-none min-h-[1.5em] flex-1 text-[28px] font-bold text-white leading-tight tracking-tight"
            data-placeholder="Heading 1"
          />
        </div>
      )
    case 'heading2':
      return (
        <div className={wrapperClass} data-block-id={block.id}>
          <div
            {...commonProps}
            className="outline-none min-h-[1.5em] flex-1 text-[22px] font-bold text-white leading-snug tracking-tight"
            data-placeholder="Heading 2"
          />
        </div>
      )
    case 'heading3':
      return (
        <div className={wrapperClass} data-block-id={block.id}>
          <div
            {...commonProps}
            className="outline-none min-h-[1.5em] flex-1 text-[17px] font-bold text-white leading-snug"
            data-placeholder="Heading 3"
          />
        </div>
      )
    case 'bulleted-list':
      return (
        <div className={wrapperClass} data-block-id={block.id}>
          <span className="text-zinc-500 mt-1.5 shrink-0">•</span>
          <div
            {...commonProps}
            className="outline-none min-h-[1.5em] flex-1 text-[15px] text-zinc-200 leading-relaxed"
            data-placeholder="List item"
          />
        </div>
      )
    case 'numbered-list':
      return (
        <div className={wrapperClass} data-block-id={block.id}>
          <span className="text-zinc-500 mt-0.5 shrink-0 text-[15px]">•</span>
          <div
            {...commonProps}
            className="outline-none min-h-[1.5em] flex-1 text-[15px] text-zinc-200 leading-relaxed"
            data-placeholder="List item"
          />
        </div>
      )
    case 'checklist':
      return (
        <div className={wrapperClass} data-block-id={block.id}>
          <input
            type="checkbox"
            checked={block.checked || false}
            onChange={(e) => onUpdate({ checked: e.target.checked })}
            className="mt-1.5 w-3.5 h-3.5 accent-white cursor-pointer shrink-0"
          />
          <div
            {...commonProps}
            className={
              'outline-none min-h-[1.5em] flex-1 text-[15px] leading-relaxed ' +
              (block.checked ? 'text-zinc-500 line-through' : 'text-zinc-200')
            }
            data-placeholder="To-do"
          />
        </div>
      )
    case 'quote':
      return (
        <div className={wrapperClass} data-block-id={block.id}>
          <div className="flex-1 pl-4 border-l-2 border-zinc-700">
            <div
              {...commonProps}
              className="outline-none min-h-[1.5em] text-[15px] text-zinc-300 italic leading-relaxed"
              data-placeholder="Quote..."
            />
          </div>
        </div>
      )
    case 'code':
      return (
        <div className={wrapperClass} data-block-id={block.id}>
          <div className="flex-1 rounded-md bg-zinc-950 border border-zinc-800 p-3 font-mono">
            <div
              {...commonProps}
              className="outline-none min-h-[1.5em] text-[13px] text-emerald-400 leading-relaxed"
              data-placeholder="// code"
            />
          </div>
        </div>
      )
    case 'divider':
      return (
        <div className="py-4" data-block-id={block.id}>
          <div className="h-px bg-zinc-800" />
        </div>
      )
    case 'image':
      return (
        <div className="my-3" data-block-id={block.id}>
          {block.url ? (
            <figure className="rounded-lg overflow-hidden border border-zinc-800">
              <img src={block.url} alt={block.caption || ''} className="w-full" />
              {block.caption && (
                <figcaption className="px-3 py-2 text-[12px] text-zinc-500 bg-zinc-950/50">
                  {block.caption}
                </figcaption>
              )}
            </figure>
          ) : (
            <div className="rounded-lg border border-dashed border-zinc-800 p-6 text-center text-[12px] text-zinc-500">
              Image block (upload from media panel)
            </div>
          )}
        </div>
      )
    case 'paragraph':
    default:
      return (
        <div className={wrapperClass} data-block-id={block.id}>
          <div
            {...commonProps}
            className="outline-none min-h-[1.5em] flex-1 text-[15px] text-zinc-200 leading-[1.7]"
            data-placeholder="Type something, or / for commands..."
            style={{ minHeight: '1.7em' }}
          />
        </div>
      )
  }
}

// ─── Floating text formatting toolbar ───
export function TextFormatToolbar() {
  const [visible, setVisible] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })

  useEffect(() => {
    const handleSelectionChange = () => {
      const sel = window.getSelection()
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
        setVisible(false)
        return
      }

      // Only show for selections inside contenteditable
      const range = sel.getRangeAt(0)
      const node = range.commonAncestorContainer as Node
      const el = (node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement) as HTMLElement
      if (!el?.closest('[contenteditable="true"]')) {
        setVisible(false)
        return
      }

      const rect = range.getBoundingClientRect()
      if (rect.width === 0 && rect.height === 0) {
        setVisible(false)
        return
      }

      setPosition({
        top: rect.top - 42,
        left: rect.left + rect.width / 2,
      })
      setVisible(true)
    }

    document.addEventListener('selectionchange', handleSelectionChange)
    return () => document.removeEventListener('selectionchange', handleSelectionChange)
  }, [])

  const exec = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value)
  }

  const wrapLink = () => {
    const url = window.prompt('Enter URL:')
    if (!url) return
    exec('createLink', url)
  }

  if (!visible) return null

  return (
    <div
      className="fixed z-50 flex items-center gap-0.5 h-9 px-1 rounded-md border border-zinc-700 bg-[#111] shadow-[0_8px_24px_rgba(0,0,0,0.6)]"
      style={{
        top: position.top,
        left: position.left,
        transform: 'translateX(-50%)',
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <FormatButton onClick={() => exec('bold')} Icon={TextB} label="Bold" />
      <FormatButton onClick={() => exec('italic')} Icon={TextItalic} label="Italic" />
      <FormatButton onClick={() => exec('underline')} Icon={TextUnderline} label="Underline" />
      <FormatButton onClick={() => exec('strikeThrough')} Icon={TextStrikethrough} label="Strikethrough" />
      <div className="w-px h-5 bg-zinc-800 mx-0.5" />
      <FormatButton onClick={wrapLink} Icon={LinkSimple} label="Link" />
    </div>
  )
}

function FormatButton({ onClick, Icon, label }: { onClick: () => void; Icon: any; label: string }) {
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      title={label}
      className="w-7 h-7 rounded flex items-center justify-center text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
    >
      <Icon size={12} weight="bold" />
    </button>
  )
}