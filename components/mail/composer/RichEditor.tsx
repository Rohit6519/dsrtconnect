'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  TextB,
  TextItalic,
  TextUnderline,
  TextStrikethrough,
  ListBullets,
  ListNumbers,
  Quotes,
  Code,
  Link as LinkIcon,
  TextAlignLeft,
  TextAlignCenter,
  TextAlignRight,
  ArrowUUpLeft,
  ArrowUUpRight,
  CaretDown,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { LinkModal } from './LinkModal'

interface Props {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: string
}

type BlockFormat = 'p' | 'h1' | 'h2' | 'h3' | 'blockquote' | 'pre'

const BLOCK_OPTIONS: Array<{ value: BlockFormat; label: string }> = [
  { value: 'p', label: 'Paragraph' },
  { value: 'h1', label: 'Heading 1' },
  { value: 'h2', label: 'Heading 2' },
  { value: 'h3', label: 'Heading 3' },
  { value: 'blockquote', label: 'Quote' },
  { value: 'pre', label: 'Code block' },
]

function isEmptyHtml(html: string) {
  const t = (html || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/<br\s*\/?>/gi, '')
    .replace(/<div><\/div>/gi, '')
    .replace(/<p><\/p>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim()
  return t.length === 0
}

function getClosestAnchor(node: Node | null): HTMLAnchorElement | null {
  let cur: Node | null = node
  while (cur && cur !== document.body) {
    if (cur instanceof HTMLAnchorElement) return cur
    cur = cur.parentNode
  }
  return null
}

export function RichEditor({
  value,
  onChange,
  placeholder = 'Write your message...',
  minHeight = '320px',
}: Props) {
  const editorRef = useRef<HTMLDivElement>(null)
  const savedRange = useRef<Range | null>(null)
  const [showPlaceholder, setShowPlaceholder] = useState(!value || isEmptyHtml(value))
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkText, setLinkText] = useState('')
  const [linkUrl, setLinkUrl] = useState('https://')
  const [canRemoveLink, setCanRemoveLink] = useState(false)
  const [formatOpen, setFormatOpen] = useState(false)
  const [active, setActive] = useState({
    bold: false,
    italic: false,
    underline: false,
    strike: false,
    ul: false,
    ol: false,
    justifyLeft: false,
    justifyCenter: false,
    justifyRight: false,
    block: 'p' as BlockFormat,
  })

  // Keep external value in sync only when different (avoid caret jump)
  useEffect(() => {
    const el = editorRef.current
    if (!el) return
    if (el.innerHTML !== (value || '')) {
      el.innerHTML = value || ''
    }
    setShowPlaceholder(isEmptyHtml(value || ''))
  }, [value])

  const emitChange = useCallback(() => {
    const el = editorRef.current
    if (!el) return
    const html = el.innerHTML
    const empty = isEmptyHtml(html)
    setShowPlaceholder(empty)
    onChange(empty ? '' : html)
  }, [onChange])

  const persistSelection = useCallback(() => {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return
    const range = sel.getRangeAt(0)
    const el = editorRef.current
    if (!el) return
    if (!el.contains(range.commonAncestorContainer)) return
    savedRange.current = range.cloneRange()
  }, [])

  const restoreSelection = useCallback(() => {
    const el = editorRef.current
    const sel = window.getSelection()
    if (!el || !sel || !savedRange.current) return false
    el.focus()
    try {
      sel.removeAllRanges()
      sel.addRange(savedRange.current)
      return true
    } catch {
      return false
    }
  }, [])

  const refreshActive = useCallback(() => {
    try {
      const block =
        (document.queryCommandValue('formatBlock') || 'p').toLowerCase().replace(/[<>]/g, '') as BlockFormat
      setActive({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        strike: document.queryCommandState('strikeThrough'),
        ul: document.queryCommandState('insertUnorderedList'),
        ol: document.queryCommandState('insertOrderedList'),
        justifyLeft: document.queryCommandState('justifyLeft'),
        justifyCenter: document.queryCommandState('justifyCenter'),
        justifyRight: document.queryCommandState('justifyRight'),
        block: (['p', 'h1', 'h2', 'h3', 'blockquote', 'pre'].includes(block) ? block : 'p') as BlockFormat,
      })
    } catch {
      // ignore unsupported queryCommandState in some browsers
    }
  }, [])

  const exec = useCallback(
    (command: string, value?: string) => {
      const el = editorRef.current
      if (!el) return
      el.focus()
      restoreSelection()
      try {
        // Ensure editor has a selection; if collapsed at start with no content, insert a zero-width space then undo visually via command
        document.execCommand(command, false, value)
      } catch (e) {
        console.error('execCommand failed', command, e)
      }
      persistSelection()
      emitChange()
      refreshActive()
    },
    [emitChange, persistSelection, refreshActive, restoreSelection]
  )

  const execList = useCallback(
    (ordered: boolean) => {
      const el = editorRef.current
      if (!el) return
      el.focus()
      restoreSelection()

      const sel = window.getSelection()
      if (!sel || sel.rangeCount === 0) return

      // Ensure content is inside a block first
      const parent = sel.anchorNode?.parentElement
      if (parent && parent.tagName === 'DIV' && parent === el) {
        document.execCommand('formatBlock', false, 'p')
      }

      const command = ordered ? 'insertOrderedList' : 'insertUnorderedList'
      document.execCommand(command, false)

      persistSelection()
      emitChange()
      refreshActive()
    },
    [emitChange, persistSelection, refreshActive, restoreSelection]
  )

  const applyBlock = (block: BlockFormat) => {
    setFormatOpen(false)
    // formatBlock expects tag name; some browsers want <p>
    const tag = block === 'p' ? 'p' : block
    exec('formatBlock', tag)
  }

  const openLinkModal = () => {
    persistSelection()
    const sel = window.getSelection()
    const selectedText = sel?.toString() || ''
    let existingHref = 'https://'
    let existingText = selectedText
    let removable = false

    if (sel && sel.rangeCount > 0) {
      const anchor = getClosestAnchor(sel.anchorNode)
      if (anchor) {
        existingHref = anchor.getAttribute('href') || 'https://'
        existingText = selectedText || anchor.textContent || ''
        removable = true
      }
    }

    setLinkUrl(existingHref)
    setLinkText(existingText)
    setCanRemoveLink(removable)
    setLinkOpen(true)
  }

  const applyLink = ({ url, text }: { url: string; text: string }) => {
    const el = editorRef.current
    if (!el) return
    el.focus()
    restoreSelection()

    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) {
      document.execCommand(
        'insertHTML',
        false,
        `<a href="${url}" target="_blank" rel="noopener noreferrer">${escapeHtml(text)}</a>&nbsp;`
      )
    } else {
      const range = sel.getRangeAt(0)
      const existing = getClosestAnchor(sel.anchorNode)
      if (existing) {
        existing.setAttribute('href', url)
        existing.setAttribute('target', '_blank')
        existing.setAttribute('rel', 'noopener noreferrer')
        if (text && existing.textContent !== text) existing.textContent = text
      } else if (range.collapsed) {
        document.execCommand(
          'insertHTML',
          false,
          `<a href="${url}" target="_blank" rel="noopener noreferrer">${escapeHtml(text)}</a>&nbsp;`
        )
      } else {
        // Create link on selection, then ensure attributes
        document.execCommand('createLink', false, url)
        const a = getClosestAnchor(window.getSelection()?.anchorNode || null)
        if (a) {
          a.setAttribute('target', '_blank')
          a.setAttribute('rel', 'noopener noreferrer')
          if (text && a.textContent !== text) a.textContent = text
        }
      }
    }

    setLinkOpen(false)
    persistSelection()
    emitChange()
    refreshActive()
  }

  const removeLink = () => {
    const el = editorRef.current
    if (!el) return
    el.focus()
    restoreSelection()
    document.execCommand('unlink', false)
    setLinkOpen(false)
    persistSelection()
    emitChange()
    refreshActive()
  }

  // Keyboard shortcuts
  useEffect(() => {
    const el = editorRef.current
    if (!el) return

    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (!mod) return

      const key = e.key.toLowerCase()
      if (key === 'b') {
        e.preventDefault()
        exec('bold')
      } else if (key === 'i') {
        e.preventDefault()
        exec('italic')
      } else if (key === 'u') {
        e.preventDefault()
        exec('underline')
      } else if (key === 'k') {
        e.preventDefault()
        openLinkModal()
      } else if (key === 'z' && !e.shiftKey) {
        e.preventDefault()
        exec('undo')
      } else if ((key === 'z' && e.shiftKey) || key === 'y') {
        e.preventDefault()
        exec('redo')
      }
    }

    el.addEventListener('keydown', onKeyDown)
    return () => el.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exec])

  // Close format menu on outside click
  useEffect(() => {
    if (!formatOpen) return
    const onDoc = () => setFormatOpen(false)
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [formatOpen])

  const ToolbarBtn = ({
    onClick,
    icon: Icon,
    title,
    isActive = false,
  }: {
    onClick: () => void
    icon: any
    title: string
    isActive?: boolean
  }) => (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => {
        e.preventDefault() // keep selection in editor
        persistSelection()
        onClick()
      }}
      className={cn(
        'w-8 h-8 rounded-md flex items-center justify-center transition-colors',
        isActive
          ? 'bg-white/[0.12] text-white'
          : 'text-white/65 hover:text-white hover:bg-white/[0.06]'
      )}
    >
      <Icon className="w-4 h-4" weight="bold" />
    </button>
  )

  const Divider = () => <div className="w-px h-5 bg-white/[0.08] mx-0.5 flex-shrink-0" />

  const currentBlockLabel =
    BLOCK_OPTIONS.find((b) => b.value === active.block)?.label || 'Paragraph'

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2.5 py-1.5 border-b border-white/[0.05] bg-white/[0.015] flex-wrap flex-shrink-0">
        <ToolbarBtn onClick={() => exec('undo')} icon={ArrowUUpLeft} title="Undo (⌘Z)" />
        <ToolbarBtn onClick={() => exec('redo')} icon={ArrowUUpRight} title="Redo (⌘⇧Z)" />
        <Divider />

        {/* Format dropdown */}
        <div className="relative">
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault()
              persistSelection()
              setFormatOpen((v) => !v)
            }}
            className={cn(
              'h-8 px-2.5 rounded-md text-[12px] font-semibold inline-flex items-center gap-1.5 transition-colors',
              formatOpen
                ? 'bg-white/[0.12] text-white'
                : 'text-white/70 hover:text-white hover:bg-white/[0.06]'
            )}
            title="Text style"
          >
            {currentBlockLabel}
            <CaretDown className="w-3 h-3 opacity-70" weight="bold" />
          </button>
          {formatOpen && (
            <div
              className={cn(
                'absolute left-0 top-full mt-1 z-[50] w-[180px] rounded-lg overflow-hidden p-1',
                'bg-gradient-to-b from-[#16161d] to-[#0b0b10]',
                'border border-white/[0.1] shadow-2xl'
              )}
              onMouseDown={(e) => e.preventDefault()}
            >
              {BLOCK_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    applyBlock(opt.value)
                  }}
                  className={cn(
                    'w-full text-left px-2.5 py-2 rounded-md text-[12.5px] transition-colors',
                    active.block === opt.value
                      ? 'bg-white/[0.1] text-white font-semibold'
                      : 'text-white/75 hover:bg-white/[0.06] hover:text-white'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <Divider />
        <ToolbarBtn onClick={() => exec('bold')} icon={TextB} title="Bold (⌘B)" isActive={active.bold} />
        <ToolbarBtn onClick={() => exec('italic')} icon={TextItalic} title="Italic (⌘I)" isActive={active.italic} />
        <ToolbarBtn onClick={() => exec('underline')} icon={TextUnderline} title="Underline (⌘U)" isActive={active.underline} />
        <ToolbarBtn onClick={() => exec('strikeThrough')} icon={TextStrikethrough} title="Strikethrough" isActive={active.strike} />
        <Divider />
        <ToolbarBtn onClick={() => execList(false)} icon={ListBullets} title="Bullet list" isActive={active.ul} />
        <ToolbarBtn onClick={() => execList(true)} icon={ListNumbers} title="Numbered list" isActive={active.ol} />
        <ToolbarBtn onClick={() => applyBlock('blockquote')} icon={Quotes} title="Quote" isActive={active.block === 'blockquote'} />
        <ToolbarBtn onClick={() => applyBlock('pre')} icon={Code} title="Code block" isActive={active.block === 'pre'} />
        <Divider />
        <ToolbarBtn onClick={openLinkModal} icon={LinkIcon} title="Insert link (⌘K)" />
        <Divider />
        <ToolbarBtn onClick={() => exec('justifyLeft')} icon={TextAlignLeft} title="Align left" isActive={active.justifyLeft} />
        <ToolbarBtn onClick={() => exec('justifyCenter')} icon={TextAlignCenter} title="Align center" isActive={active.justifyCenter} />
        <ToolbarBtn onClick={() => exec('justifyRight')} icon={TextAlignRight} title="Align right" isActive={active.justifyRight} />
      </div>

      {/* Editable surface */}
      <div className="relative flex-1 overflow-y-auto min-h-0">
        <div
          ref={editorRef}
          contentEditable
          role="textbox"
          aria-multiline="true"
          spellCheck
          suppressContentEditableWarning
          onInput={() => {
            emitChange()
            refreshActive()
          }}
          onBlur={() => {
            persistSelection()
            emitChange()
          }}
          onKeyUp={() => {
            persistSelection()
            refreshActive()
          }}
          onMouseUp={() => {
            persistSelection()
            refreshActive()
          }}
          className={cn(
            'w-full px-5 py-4 text-[14.5px] text-white/90 leading-relaxed focus:outline-none',
            'prose prose-invert prose-sm max-w-none',
            'prose-headings:tracking-tight prose-headings:font-bold prose-headings:text-white',
            'prose-p:my-2 prose-ul:list-disc prose-ul:pl-6 prose-ol:list-decimal prose-ol:pl-6 prose-li:my-0.5',
            'prose-a:text-white prose-a:underline prose-a:underline-offset-2',
            'prose-blockquote:border-l-white/25 prose-blockquote:text-white/70 prose-blockquote:not-italic',
            'prose-code:text-white/90 prose-code:bg-white/[0.06] prose-code:px-1 prose-code:rounded',
            'prose-code:before:content-none prose-code:after:content-none',
            'prose-pre:bg-white/[0.04] prose-pre:border prose-pre:border-white/[0.08] prose-pre:rounded-lg',
            'prose-strong:text-white prose-strong:font-bold'
          )}
          style={{ minHeight }}
        />
        {showPlaceholder && (
          <div className="absolute top-4 left-5 text-[14.5px] text-white/25 pointer-events-none select-none">
            {placeholder}
          </div>
        )}
      </div>

      <LinkModal
        open={linkOpen}
        initialText={linkText}
        initialUrl={linkUrl}
        canRemove={canRemoveLink}
        onClose={() => setLinkOpen(false)}
        onConfirm={applyLink}
        onRemove={removeLink}
      />
    </div>
  )
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}