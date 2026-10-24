'use client'

import { useState, useEffect, useRef } from 'react'
import { useStudio } from '../../StudioContext'
import { TextB, TextItalic, ListBullets, ListNumbers } from '@phosphor-icons/react'

export function StudioRichEditor() {
  const { draft, updateField } = useStudio()
  
  const [text, setText] = useState(
    draft.opportunity.content_text || draft.opportunity.description || ''
  )
  
  const seeded = useRef(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!seeded.current) {
      const initialValue = draft.opportunity.content_text || draft.opportunity.description || ''
      if (initialValue) {
        setText(initialValue)
      }
      seeded.current = true
    }
  }, [draft.opportunity.content_text, draft.opportunity.description])

  const handleChange = (val: string) => {
    setText(val)
    updateField({ content_text: val, description: val.substring(0, 300) })
  }

  const insertText = (type: 'bold' | 'italic' | 'bullet' | 'number') => {
    const el = textareaRef.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const selectedText = text.substring(start, end)
    
    let newText = ''
    let newCursorPos = 0

    if (type === 'bullet' || type === 'number') {
      const isNumber = type === 'number'
      
      if (selectedText.length > 0) {
        // If text is selected, wrap each line. If number, auto-increment.
        const lines = selectedText.split('\n')
        const bulleted = lines.map((line: string, index: number) => {
          const prefix = isNumber ? `${index + 1}. ` : '- '
          // Avoid double-prefixing if they already have it
          if (line.startsWith('- ') || /^\d+\.\s/.test(line)) return line
          return `${prefix}${line}`
        }).join('\n')
        
        newText = text.substring(0, start) + bulleted + text.substring(end)
        newCursorPos = start + bulleted.length
      } else {
        // No selection: insert at cursor
        const textBeforeCursor = text.substring(0, start)
        const isStartOfLine = start === 0 || textBeforeCursor.endsWith('\n')
        
        // Find previous lines to auto-increment number if needed
        let prefix = isNumber ? '1. ' : '- '
        if (isNumber && isStartOfLine && textBeforeCursor.length > 0) {
          const prevLines = textBeforeCursor.trimEnd().split('\n')
          const lastLine = prevLines[prevLines.length - 1]
          const match = lastLine.match(/^(\d+)\.\s/)
          if (match) {
            prefix = `${parseInt(match[1]) + 1}. `
          }
        }

        const insertion = isStartOfLine ? prefix : `\n${prefix}`
        newText = text.substring(0, start) + insertion + text.substring(end)
        newCursorPos = start + insertion.length
      }
    } else {
      // Bold or Italic
      const wrap = type === 'bold' ? '**' : '*'
      newText = text.substring(0, start) + wrap + selectedText + wrap + text.substring(end)
      newCursorPos = start + wrap.length + selectedText.length
    }

    setText(newText)
    updateField({ content_text: newText, description: newText.substring(0, 300) })
    
    setTimeout(() => {
      el.focus()
      el.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'b' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      insertText('bold')
    }
    if (e.key === 'i' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      insertText('italic')
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-[#0c0c0e] overflow-hidden focus-within:border-zinc-600 transition-colors shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
      <div className="flex items-center gap-1 px-3 py-2 border-b border-zinc-800/80 bg-zinc-950/50">
        <ToolBtn icon={TextB} title="Bold (Cmd+B)" onClick={() => insertText('bold')} />
        <ToolBtn icon={TextItalic} title="Italic (Cmd+I)" onClick={() => insertText('italic')} />
        <div className="w-px h-4 bg-zinc-800 mx-1" />
        <ToolBtn icon={ListBullets} title="Bullet List" onClick={() => insertText('bullet')} />
        <ToolBtn icon={ListNumbers} title="Numbered List" onClick={() => insertText('number')} />
      </div>
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Describe the opportunity in detail. What will they do? What is the goal?..."
        className="w-full min-h-[300px] p-5 bg-transparent text-[14px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none resize-y leading-relaxed"
      />
    </div>
  )
}

function ToolBtn({
  icon: Icon,
  title,
  onClick,
}: {
  icon: any
  title?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
    >
      <Icon size={14} weight="bold" />
    </button>
  )
}