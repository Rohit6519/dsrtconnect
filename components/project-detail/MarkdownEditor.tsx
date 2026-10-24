'use client'

import { useState, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  TextB, TextItalic, TextUnderline, Link, ListBullets, ListNumbers,
  Quotes, Code, Eye, PencilSimple, TextH
} from '@phosphor-icons/react'

interface Props {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  minHeight?: number
  maxLength?: number
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = 'Write something...',
  minHeight = 200,
  maxLength = 10000,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [mode, setMode] = useState<'write' | 'preview'>('write')

  const insertAtCursor = (before: string, after: string = '', placeholder: string = '') => {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const selected = value.substring(start, end)
    const text = selected || placeholder
    const newValue = value.substring(0, start) + before + text + after + value.substring(end)
    onChange(newValue)
    setTimeout(() => {
      ta.focus()
      const cursorPos = start + before.length + text.length
      ta.setSelectionRange(cursorPos, cursorPos)
    }, 0)
  }

  const insertLine = (prefix: string) => {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const beforeCursor = value.substring(0, start)
    const lineStart = beforeCursor.lastIndexOf('\n') + 1
    const newValue = value.substring(0, lineStart) + prefix + value.substring(lineStart)
    onChange(newValue)
    setTimeout(() => {
      ta.focus()
      ta.setSelectionRange(start + prefix.length, start + prefix.length)
    }, 0)
  }

  const promptLink = () => {
    const url = window.prompt('Enter URL:', 'https://')
    if (url && /^https?:\/\//.test(url)) {
      insertAtCursor('[', '](' + url + ')', 'link text')
    }
  }

  const btn = 'w-7 h-7 rounded flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors'

  return (
    <div className="bg-white/[0.03] border border-white/[0.08] rounded-lg overflow-hidden focus-within:border-purple-500/50 transition-colors">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-1 px-2 py-1.5 border-b border-white/[0.06] bg-white/[0.02]">
        <div className="flex items-center gap-0.5 flex-wrap">
          <button type="button" onClick={() => insertAtCursor('**', '**', 'bold')} className={btn} title="Bold (Ctrl+B)">
            <TextB size={14} weight="bold" />
          </button>
          <button type="button" onClick={() => insertAtCursor('*', '*', 'italic')} className={btn} title="Italic">
            <TextItalic size={14} />
          </button>
          <button type="button" onClick={() => insertAtCursor('__', '__', 'underline')} className={btn} title="Underline">
            <TextUnderline size={14} />
          </button>
          <div className="w-px h-4 bg-white/[0.08] mx-1" />
          <button type="button" onClick={() => insertLine('## ')} className={btn} title="Heading">
            <TextH size={14} weight="bold" />
          </button>
          <button type="button" onClick={promptLink} className={btn} title="Link">
            <Link size={14} />
          </button>
          <div className="w-px h-4 bg-white/[0.08] mx-1" />
          <button type="button" onClick={() => insertLine('- ')} className={btn} title="Bullet list">
            <ListBullets size={14} />
          </button>
          <button type="button" onClick={() => insertLine('1. ')} className={btn} title="Numbered list">
            <ListNumbers size={14} />
          </button>
          <button type="button" onClick={() => insertLine('> ')} className={btn} title="Quote">
            <Quotes size={14} />
          </button>
          <button type="button" onClick={() => insertAtCursor('`', '`', 'code')} className={btn} title="Inline code">
            <Code size={14} />
          </button>
        </div>

        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => setMode('write')}
            className={
              'px-2 h-7 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ' +
              (mode === 'write' ? 'bg-purple-500/20 text-purple-300' : 'text-zinc-500 hover:text-white')
            }
          >
            <PencilSimple size={11} /> Write
          </button>
          <button
            type="button"
            onClick={() => setMode('preview')}
            className={
              'px-2 h-7 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ' +
              (mode === 'preview' ? 'bg-purple-500/20 text-purple-300' : 'text-zinc-500 hover:text-white')
            }
          >
            <Eye size={11} /> Preview
          </button>
        </div>
      </div>

      {/* Body */}
      {mode === 'write' ? (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
          placeholder={placeholder}
          style={{ minHeight: minHeight + 'px' }}
          className="w-full bg-transparent text-sm text-white placeholder:text-zinc-600 p-4 outline-none resize-y font-mono leading-relaxed"
        />
      ) : (
        <div
          style={{ minHeight: minHeight + 'px' }}
          className="prose prose-invert prose-sm max-w-none p-4 text-sm text-zinc-200 prose-headings:text-white prose-strong:text-white prose-a:text-purple-400"
        >
          {value ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
          ) : (
            <p className="text-zinc-600 italic">Nothing to preview yet.</p>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-white/[0.06] bg-white/[0.02]">
        <span className="text-[10px] text-zinc-600">Supports **bold**, *italic*, [links](url), lists, code</span>
        <span className="text-[10px] text-zinc-500">
          {value.length} / {maxLength}
        </span>
      </div>
    </div>
  )
}
