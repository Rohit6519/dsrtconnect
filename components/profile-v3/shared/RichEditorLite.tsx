'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import {
  TextB,
  TextItalic,
  TextUnderline,
  Link as LinkIcon,
  ListBullets,
  ListNumbers,
  ListChecks,
  Quotes,
  Code,
  TextH,
  TextAa,
  Eraser,
  Image as ImageIcon,
} from '@phosphor-icons/react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface RichEditorLiteProps {
  value: string                        // HTML content
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: string
  toolbar?: 'minimal' | 'standard' | 'full'
  className?: string
  onImageInsert?: () => Promise<string | null>  // returns image URL
}

// ─── Toolbar config ───────────────────────────────────────────────────────────

const HEADINGS = [
  { value: 'p',  label: 'Paragraph' },
  { value: 'h1', label: 'Heading 1' },
  { value: 'h2', label: 'Heading 2' },
  { value: 'h3', label: 'Heading 3' },
] as const

// ─── Main Component ───────────────────────────────────────────────────────────

export function RichEditorLite({
  value,
  onChange,
  placeholder = 'Start writing...',
  minHeight = '120px',
  toolbar = 'standard',
  className,
  onImageInsert,
}: RichEditorLiteProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [savedRange, setSavedRange] = useState<Range | null>(null)

  // Sync external `value` prop into the editor (initial render + external resets)
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || ''
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML)
    }
  }

  const exec = useCallback((command: string, arg?: string) => {
    document.execCommand(command, false, arg)
    editorRef.current?.focus()
    handleInput()
  }, [])

  const setHeading = (tag: string) => {
    if (tag === 'p') exec('formatBlock', 'p')
    else exec('formatBlock', tag)
  }

  const handleLinkClick = () => {
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0) {
      setSavedRange(sel.getRangeAt(0).cloneRange())
    }
    setShowLinkInput(true)
  }

  const applyLink = () => {
    if (!linkUrl.trim()) {
      setShowLinkInput(false)
      return
    }
    // Restore selection
    if (savedRange) {
      const sel = window.getSelection()
      sel?.removeAllRanges()
      sel?.addRange(savedRange)
    }
    exec('createLink', linkUrl)
    setLinkUrl('')
    setShowLinkInput(false)
    setSavedRange(null)
  }

  const handleImageClick = async () => {
    if (!onImageInsert) return
    const url = await onImageInsert()
    if (url) {
      exec('insertImage', url)
    }
  }

  const clearFormatting = () => {
    exec('removeFormat')
    exec('formatBlock', 'p')
  }

  return (
    <div className={cn(
      'border border-zinc-800/60 rounded-xl overflow-hidden bg-zinc-950/50 focus-within:border-zinc-700 transition-colors',
      className
    )}>
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 border-b border-zinc-800/60 px-2 py-1.5 bg-zinc-900/40 flex-wrap">
        {/* Heading dropdown */}
        {toolbar !== 'minimal' && (
          <select
            onChange={(e) => setHeading(e.target.value)}
            className="text-[11px] bg-transparent text-zinc-400 border-none focus:outline-none px-2 py-1 rounded hover:bg-zinc-800 cursor-pointer"
            defaultValue="p"
          >
            {HEADINGS.map((h) => (
              <option key={h.value} value={h.value} className="bg-zinc-900">
                {h.label}
              </option>
            ))}
          </select>
        )}

        {toolbar !== 'minimal' && <div className="w-px h-5 bg-zinc-800 mx-1" />}

        <ToolbarButton onClick={() => exec('bold')} title="Bold (Ctrl+B)">
          <TextB className="w-3.5 h-3.5" weight="bold" />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec('italic')} title="Italic (Ctrl+I)">
          <TextItalic className="w-3.5 h-3.5" weight="bold" />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec('underline')} title="Underline (Ctrl+U)">
          <TextUnderline className="w-3.5 h-3.5" weight="bold" />
        </ToolbarButton>

        {toolbar !== 'minimal' && (
          <>
            <div className="w-px h-5 bg-zinc-800 mx-1" />
            <ToolbarButton onClick={() => exec('insertUnorderedList')} title="Bullet List">
              <ListBullets className="w-3.5 h-3.5" weight="bold" />
            </ToolbarButton>
            <ToolbarButton onClick={() => exec('insertOrderedList')} title="Numbered List">
              <ListNumbers className="w-3.5 h-3.5" weight="bold" />
            </ToolbarButton>
            {toolbar === 'full' && (
              <ToolbarButton onClick={() => exec('formatBlock', 'blockquote')} title="Quote">
                <Quotes className="w-3.5 h-3.5" weight="bold" />
              </ToolbarButton>
            )}
          </>
        )}

        <div className="w-px h-5 bg-zinc-800 mx-1" />

        <ToolbarButton onClick={handleLinkClick} title="Insert Link">
          <LinkIcon className="w-3.5 h-3.5" weight="bold" />
        </ToolbarButton>

        {toolbar === 'full' && onImageInsert && (
          <ToolbarButton onClick={handleImageClick} title="Insert Image">
            <ImageIcon className="w-3.5 h-3.5" weight="bold" />
          </ToolbarButton>
        )}

        {toolbar === 'full' && (
          <ToolbarButton onClick={() => exec('formatBlock', 'pre')} title="Code Block">
            <Code className="w-3.5 h-3.5" weight="bold" />
          </ToolbarButton>
        )}

        <div className="flex-1" />

        <ToolbarButton onClick={clearFormatting} title="Clear Formatting">
          <Eraser className="w-3.5 h-3.5" weight="bold" />
        </ToolbarButton>
      </div>

      {/* Link input popup */}
      {showLinkInput && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-800/60 bg-zinc-900/60">
          <LinkIcon className="w-3.5 h-3.5 text-zinc-500" weight="bold" />
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); applyLink() }
              if (e.key === 'Escape') { setShowLinkInput(false); setLinkUrl('') }
            }}
            placeholder="Paste URL and press Enter"
            autoFocus
            className="flex-1 bg-transparent text-[13px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none"
          />
          <button
            onClick={applyLink}
            className="text-[11px] px-2 py-1 bg-white text-black rounded font-semibold hover:bg-zinc-100"
          >
            Add
          </button>
          <button
            onClick={() => { setShowLinkInput(false); setLinkUrl('') }}
            className="text-[11px] text-zinc-500 hover:text-zinc-300 px-2"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Editable content */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onPaste={(e) => {
          // Strip formatting on paste — cleaner
          e.preventDefault()
          const text = e.clipboardData.getData('text/plain')
          document.execCommand('insertText', false, text)
        }}
        data-placeholder={placeholder}
        style={{ minHeight }}
        className={cn(
          'p-3 text-[13.5px] text-zinc-200 leading-[1.65] focus:outline-none',
          'empty:before:content-[attr(data-placeholder)] empty:before:text-zinc-600',
          '[&_h1]:text-[20px] [&_h1]:font-bold [&_h1]:my-3 [&_h1]:text-white',
          '[&_h2]:text-[17px] [&_h2]:font-bold [&_h2]:my-2.5 [&_h2]:text-white',
          '[&_h3]:text-[15px] [&_h3]:font-bold [&_h3]:my-2 [&_h3]:text-white',
          '[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-2',
          '[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-2',
          '[&_li]:my-1',
          '[&_a]:text-blue-400 [&_a]:underline [&_a]:decoration-blue-400/40 hover:[&_a]:decoration-blue-400',
          '[&_blockquote]:border-l-2 [&_blockquote]:border-zinc-700 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-zinc-400 [&_blockquote]:my-2',
          '[&_pre]:bg-zinc-900 [&_pre]:border [&_pre]:border-zinc-800 [&_pre]:rounded [&_pre]:p-2 [&_pre]:text-[12px] [&_pre]:font-mono [&_pre]:overflow-x-auto',
          '[&_img]:rounded-lg [&_img]:my-2 [&_img]:max-w-full',
        )}
      />
    </div>
  )
}

function ToolbarButton({
  onClick,
  title,
  children,
}: {
  onClick: () => void
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()} // preserve selection
      onClick={onClick}
      title={title}
      className="w-7 h-7 rounded flex items-center justify-center text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
    >
      {children}
    </button>
  )
}