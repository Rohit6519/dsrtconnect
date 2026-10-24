'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Plus, Trash, DotsSix, TextT, TextHOne, TextHTwo, ListBullets,
  ListNumbers, Quotes, Code, Minus, ImageSquare, VideoCamera, LightbulbFilament
} from '@phosphor-icons/react'

export interface UpdateBlock {
  id: string
  type: 'paragraph' | 'heading1' | 'heading2' | 'bullet' | 'numbered' | 'quote' | 'callout' | 'code' | 'divider' | 'image' | 'video'
  content: string
  meta?: any
}

interface Props {
  blocks: UpdateBlock[]
  onChange: (blocks: UpdateBlock[]) => void
  disabled?: boolean
}

const BLOCK_TYPES = [
  { type: 'paragraph', label: 'Paragraph', icon: TextT, command: '/p' },
  { type: 'heading1', label: 'Heading 1', icon: TextHOne, command: '/h1' },
  { type: 'heading2', label: 'Heading 2', icon: TextHTwo, command: '/h2' },
  { type: 'bullet', label: 'Bullet list', icon: ListBullets, command: '/bullet' },
  { type: 'numbered', label: 'Numbered list', icon: ListNumbers, command: '/numbered' },
  { type: 'quote', label: 'Quote', icon: Quotes, command: '/quote' },
  { type: 'callout', label: 'Callout', icon: LightbulbFilament, command: '/callout' },
  { type: 'code', label: 'Code', icon: Code, command: '/code' },
  { type: 'divider', label: 'Divider', icon: Minus, command: '/divider' },
]

export function UpdateBlockEditor({ blocks, onChange, disabled = false }: Props) {
  const [showAddMenu, setShowAddMenu] = useState<string | null>(null)

  const addBlock = (afterId?: string, type: UpdateBlock['type'] = 'paragraph') => {
    const newBlock: UpdateBlock = {
      id: `blk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type,
      content: '',
    }
    if (type === 'divider') {
      newBlock.content = '---'
    }
    if (!afterId) {
      onChange([...blocks, newBlock])
    } else {
      const idx = blocks.findIndex(b => b.id === afterId)
      const next = [...blocks]
      next.splice(idx + 1, 0, newBlock)
      onChange(next)
    }
    setShowAddMenu(null)
  }

  const updateBlock = (id: string, patch: Partial<UpdateBlock>) => {
    onChange(blocks.map(b => b.id === id ? { ...b, ...patch } : b))
  }

  const deleteBlock = (id: string) => {
    if (blocks.length <= 1) {
      onChange([{ id: `blk_${Date.now()}`, type: 'paragraph', content: '' }])
    } else {
      onChange(blocks.filter(b => b.id !== id))
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, block: UpdateBlock) => {
    if (e.key === 'Enter' && !e.shiftKey && block.type !== 'code') {
      e.preventDefault()
      addBlock(block.id, 'paragraph')
    }
    if (e.key === 'Backspace' && block.content === '') {
      e.preventDefault()
      deleteBlock(block.id)
    }
  }

  const handleInputChange = (block: UpdateBlock, value: string) => {
    // Slash command conversion
    if (value === '/h1') { updateBlock(block.id, { type: 'heading1', content: '' }); return }
    if (value === '/h2') { updateBlock(block.id, { type: 'heading2', content: '' }); return }
    if (value === '/bullet') { updateBlock(block.id, { type: 'bullet', content: '' }); return }
    if (value === '/numbered') { updateBlock(block.id, { type: 'numbered', content: '' }); return }
    if (value === '/quote') { updateBlock(block.id, { type: 'quote', content: '' }); return }
    if (value === '/callout') { updateBlock(block.id, { type: 'callout', content: '' }); return }
    if (value === '/code') { updateBlock(block.id, { type: 'code', content: '' }); return }
    if (value === '/divider' || value === '---') { updateBlock(block.id, { type: 'divider', content: '---' }); return }
    updateBlock(block.id, { content: value })
  }

  return (
    <div className="space-y-2">
      {blocks.map(block => (
        <BlockRow
          key={block.id}
          block={block}
          disabled={disabled}
          onChange={(value) => handleInputChange(block, value)}
          onKeyDown={(e) => handleKeyDown(e, block)}
          onDelete={() => deleteBlock(block.id)}
          onAddMenu={() => setShowAddMenu(showAddMenu === block.id ? null : block.id)}
          showAddMenu={showAddMenu === block.id}
          onAddBlock={(type) => addBlock(block.id, type)}
        />
      ))}

      {!disabled && blocks.length === 0 && (
        <button
          onClick={() => addBlock(undefined, 'paragraph')}
          className="w-full text-left p-3 text-[13px] text-zinc-500 hover:text-white hover:bg-white/[0.02] rounded-lg transition-colors"
        >
          Start writing or press <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-[10.5px] font-mono">/</kbd> for commands...
        </button>
      )}
    </div>
  )
}

function BlockRow({
  block, disabled, onChange, onKeyDown, onDelete, onAddMenu, showAddMenu, onAddBlock
}: {
  block: UpdateBlock
  disabled: boolean
  onChange: (value: string) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  onDelete: () => void
  onAddMenu: () => void
  showAddMenu: boolean
  onAddBlock: (type: UpdateBlock['type']) => void
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [block.content])

  const commonProps = {
    ref: textareaRef,
    value: block.content,
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value),
    onKeyDown,
    disabled,
    rows: 1,
    className: 'w-full bg-transparent focus:outline-none resize-none leading-relaxed',
  }

  return (
    <div className="group relative -ml-8 flex items-start gap-1">
      {!disabled && (
        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 pt-1.5 transition-opacity">
          <div className="relative">
            <button
              onClick={onAddMenu}
              className="w-5 h-5 rounded hover:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-white"
              title="Add block"
            >
              <Plus size={11} weight="bold" />
            </button>
            {showAddMenu && (
              <div className="absolute left-0 top-6 z-30 bg-[#0d0d10] border border-zinc-800 rounded-xl shadow-2xl p-1 w-52">
                {BLOCK_TYPES.map(bt => {
                  const Icon = bt.icon
                  return (
                    <button
                      key={bt.type}
                      onClick={() => onAddBlock(bt.type as UpdateBlock['type'])}
                      className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-zinc-800 text-left transition-colors"
                    >
                      <div className="w-7 h-7 rounded bg-zinc-800 flex items-center justify-center flex-shrink-0">
                        <Icon size={14} className="text-zinc-300" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12.5px] font-semibold text-white">{bt.label}</p>
                        <p className="text-[10.5px] text-zinc-500 font-mono">{bt.command}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
          <button
            onClick={onDelete}
            className="w-5 h-5 rounded hover:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-red-400"
            title="Delete"
          >
            <Trash size={11} />
          </button>
        </div>
      )}

      <div className="flex-1 min-w-0">
        {block.type === 'heading1' && (
          <textarea {...commonProps} placeholder="Heading 1" className={commonProps.className + ' text-[24px] font-bold text-white placeholder:text-zinc-700'} />
        )}
        {block.type === 'heading2' && (
          <textarea {...commonProps} placeholder="Heading 2" className={commonProps.className + ' text-[19px] font-bold text-white placeholder:text-zinc-700'} />
        )}
        {block.type === 'paragraph' && (
          <textarea {...commonProps} placeholder="Type text or / for commands..." className={commonProps.className + ' text-[14px] text-zinc-200 placeholder:text-zinc-700'} />
        )}
        {block.type === 'bullet' && (
          <div className="flex items-start gap-2">
            <span className="text-zinc-500 mt-1 text-[14px]">•</span>
            <textarea {...commonProps} placeholder="List item..." className={commonProps.className + ' text-[14px] text-zinc-200 placeholder:text-zinc-700'} />
          </div>
        )}
        {block.type === 'numbered' && (
          <div className="flex items-start gap-2">
            <span className="text-zinc-500 mt-1 text-[13px] font-mono">1.</span>
            <textarea {...commonProps} placeholder="List item..." className={commonProps.className + ' text-[14px] text-zinc-200 placeholder:text-zinc-700'} />
          </div>
        )}
        {block.type === 'quote' && (
          <div className="pl-3 border-l-2 border-zinc-700">
            <textarea {...commonProps} placeholder="Quote..." className={commonProps.className + ' text-[14px] text-zinc-400 italic placeholder:text-zinc-700'} />
          </div>
        )}
        {block.type === 'callout' && (
          <div className="p-3 bg-white/[0.03] border border-zinc-800 rounded-xl flex items-start gap-2.5">
            <LightbulbFilament size={14} className="text-amber-400 flex-shrink-0 mt-1" />
            <textarea {...commonProps} placeholder="Highlight something important..." className={commonProps.className + ' text-[13.5px] text-zinc-200 placeholder:text-zinc-700'} />
          </div>
        )}
        {block.type === 'code' && (
          <div className="p-3 bg-black border border-zinc-800 rounded-lg">
            <textarea {...commonProps} placeholder="// code" className={commonProps.className + ' text-[12.5px] text-emerald-400 placeholder:text-zinc-700 font-mono'} rows={3} />
          </div>
        )}
        {block.type === 'divider' && (
          <div className="py-2">
            <hr className="border-zinc-800" />
          </div>
        )}
      </div>
    </div>
  )
}