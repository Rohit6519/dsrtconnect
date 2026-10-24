'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  TextB, TextItalic, TextUnderline, TextStrikethrough,
  ListBullets, ListNumbers, Quotes, Link as LinkIcon, X, Check,
  ArrowsClockwise
} from '@phosphor-icons/react'

interface Props {
  value: string
  onSave: (v: string) => void | Promise<void>
  placeholder?: string
  maxLen?: number
  singleLine?: boolean
  disabled?: boolean
}

export function QuestionRichEditor({
  value, onSave, placeholder, maxLen, singleLine = false, disabled = false
}: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value || '')
  const [showToolbar, setShowToolbar] = useState(false)
  const editorRef = useRef<HTMLDivElement | null>(null)
  const savedSelection = useRef<Range | null>(null)

  useEffect(() => { setDraft(value || '') }, [value])

  const startEdit = () => {
    if (disabled) return
    setEditing(true)
  }

  const cancel = () => {
    setEditing(false)
    setDraft(value || '')
    if (editorRef.current) {
      editorRef.current.innerHTML = renderRich(value || '')
    }
  }

  const commit = async () => {
    const cleanDraft = editorRef.current?.innerHTML || draft
    // Strip empty <div><br></div> patterns
    const normalized = normalizeHtml(cleanDraft)
    if (normalized === value) {
      setEditing(false)
      return
    }
    await onSave(normalized)
    setEditing(false)
  }

  const applyFormat = (cmd: string, val?: string) => {
    editorRef.current?.focus()
    if (savedSelection.current) {
      const sel = window.getSelection()
      sel?.removeAllRanges()
      sel?.addRange(savedSelection.current)
    }
    document.execCommand(cmd, false, val)
  }

  const saveSelection = () => {
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0) {
      savedSelection.current = sel.getRangeAt(0).cloneRange()
    }
  }

  const promptLink = () => {
    const url = window.prompt('Enter URL:', 'https://')
    if (url) applyFormat('createLink', url)
  }

  const handleInput = () => {
    if (editorRef.current) {
      setDraft(editorRef.current.innerHTML)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); cancel() }
    if (singleLine && e.key === 'Enter') { e.preventDefault(); commit() }
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); commit() }
    if ((e.metaKey || e.ctrlKey) && e.key === 'b') { e.preventDefault(); applyFormat('bold') }
    if ((e.metaKey || e.ctrlKey) && e.key === 'i') { e.preventDefault(); applyFormat('italic') }
    if ((e.metaKey || e.ctrlKey) && e.key === 'u') { e.preventDefault(); applyFormat('underline') }
  }

  const textLength = editorRef.current?.innerText?.length || 0
  const hasValue = !!value && value.trim().length > 0
  const overLimit = maxLen ? textLength > maxLen : false

  // ─── DISPLAY (not editing) ───
  if (!editing) {
    return (
      <div
        onClick={startEdit}
        className={
          'group relative rounded-lg border border-white/[0.06] bg-white/[0.02] px-3.5 py-3 min-h-[44px] transition-colors ' +
          (disabled
            ? 'cursor-default'
            : 'cursor-text hover:border-white/[0.12] hover:bg-white/[0.03]')
        }
      >
        {hasValue ? (
          <div
            className="text-[13.5px] text-white/85 leading-relaxed prose-tight"
            dangerouslySetInnerHTML={{ __html: renderRich(value) }}
          />
        ) : (
          <p className="text-[13px] text-white/35 italic">
            {disabled ? 'Not answered yet' : (placeholder || 'Click to add answer…')}
          </p>
        )}
        {!disabled && hasValue && (
          <span className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 text-white/40 text-[10.5px] transition-opacity">
            Click to edit
          </span>
        )}
      </div>
    )
  }

  // ─── EDIT MODE ───
  return (
    <div className="rounded-lg border border-white/[0.15] bg-white/[0.03] overflow-hidden focus-within:border-white/[0.25] transition-colors">
      {!singleLine && showToolbar && (
        <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-white/[0.06] bg-white/[0.02]">
          <ToolBtn icon={TextB} onMouseDown={saveSelection} onClick={() => applyFormat('bold')} title="Bold (⌘B)" />
          <ToolBtn icon={TextItalic} onMouseDown={saveSelection} onClick={() => applyFormat('italic')} title="Italic (⌘I)" />
          <ToolBtn icon={TextUnderline} onMouseDown={saveSelection} onClick={() => applyFormat('underline')} title="Underline (⌘U)" />
          <ToolBtn icon={TextStrikethrough} onMouseDown={saveSelection} onClick={() => applyFormat('strikeThrough')} title="Strikethrough" />
          <div className="w-px h-4 bg-white/[0.1] mx-1" />
          <ToolBtn icon={ListBullets} onMouseDown={saveSelection} onClick={() => applyFormat('insertUnorderedList')} title="Bulleted list" />
          <ToolBtn icon={ListNumbers} onMouseDown={saveSelection} onClick={() => applyFormat('insertOrderedList')} title="Numbered list" />
          <ToolBtn icon={Quotes} onMouseDown={saveSelection} onClick={() => applyFormat('formatBlock', 'blockquote')} title="Blockquote" />
          <ToolBtn icon={LinkIcon} onMouseDown={saveSelection} onClick={promptLink} title="Link" />
          <div className="flex-1" />
          <button
            onMouseDown={saveSelection}
            onClick={() => applyFormat('removeFormat')}
            className="text-[10px] font-mono text-white/50 hover:text-white px-2 h-6 rounded flex items-center gap-1"
            title="Clear formatting"
          >
            <ArrowsClockwise size={9} /> Clear
          </button>
        </div>
      )}

      {singleLine ? (
        <input
          autoFocus
          value={stripHtml(draft)}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          maxLength={maxLen}
          className="w-full h-10 px-3.5 bg-transparent text-[13.5px] text-white placeholder:text-white/30 focus:outline-none"
        />
      ) : (
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label={placeholder || 'Answer'}
          onInput={handleInput}
          onFocus={() => setShowToolbar(true)}
          onBlur={() => setTimeout(() => setShowToolbar(false), 100)}
          onKeyDown={handleKeyDown}
          data-placeholder={placeholder}
          className="min-h-[100px] max-h-[400px] overflow-y-auto px-3.5 py-3 text-[13.5px] text-white leading-relaxed focus:outline-none prose-tight empty:before:content-[attr(data-placeholder)] empty:before:text-white/30 empty:before:pointer-events-none"
          style={{ wordBreak: 'break-word' }}
          dangerouslySetInnerHTML={{ __html: renderRich(value || '') }}
        />
      )}

      <div className="flex items-center justify-between px-3 py-2 border-t border-white/[0.06] bg-white/[0.02]">
        <div className="flex items-center gap-2.5 text-[10.5px] text-white/40">
          <span className={overLimit ? 'text-orange-400 font-semibold' : ''}>
            {textLength}{maxLen ? ` / ${maxLen}` : ''}
          </span>
          <span className="text-white/25">·</span>
          <span>⌘↵ save · Esc cancel</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={cancel}
            className="inline-flex items-center h-7 px-2.5 text-[11.5px] font-medium text-white/60 hover:text-white transition-colors"
          >
            <X size={11} className="mr-1" /> Cancel
          </button>
          <button
            onClick={commit}
            disabled={overLimit}
            className="inline-flex items-center h-7 px-2.5 rounded bg-white text-black text-[11.5px] font-semibold hover:bg-zinc-100 disabled:opacity-50"
          >
            <Check size={11} weight="bold" className="mr-1" /> Save
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Helpers ───

function ToolBtn({ icon: Icon, onClick, onMouseDown, title }: {
  icon: any; onClick: () => void; onMouseDown?: () => void; title: string
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); onMouseDown?.() }}
      onClick={onClick}
      className="w-7 h-7 rounded flex items-center justify-center text-white/60 hover:text-white hover:bg-white/[0.08] transition-colors"
    >
      <Icon size={12} weight="bold" />
    </button>
  )
}

function renderRich(html: string): string {
  if (!html) return ''
  // Value may be plain text (from earlier assessment steps) or HTML.
  // If it doesn't contain any HTML tags, convert line-breaks to <br>.
  if (!/<[a-z][\s\S]*>/i.test(html)) {
    return escapeHtml(html).replace(/\n/g, '<br>')
  }
  return html
}

function normalizeHtml(html: string): string {
  const trimmed = html.replace(/^(<br\s*\/?>|\s|&nbsp;)+|(<br\s*\/?>|\s|&nbsp;)+$/gi, '').trim()
  return trimmed
}

function stripHtml(html: string): string {
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return tmp.textContent || tmp.innerText || ''
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}