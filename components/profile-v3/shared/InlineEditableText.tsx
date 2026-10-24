'use client'

import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { PencilSimple, Check, X } from '@phosphor-icons/react'

interface InlineEditableTextProps {
  value: string
  onSave: (newValue: string) => Promise<void>
  isOwner: boolean
  placeholder?: string
  className?: string
  editClassName?: string
  maxLength?: number
  multiline?: boolean
  showEditIcon?: boolean
}

export function InlineEditableText({
  value,
  onSave,
  isOwner,
  placeholder = 'Click to edit',
  className,
  editClassName,
  maxLength = 200,
  multiline = false,
  showEditIcon = false,
}: InlineEditableTextProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)

  useEffect(() => {
    setDraft(value)
  }, [value])

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  const save = async () => {
    if (draft.trim() === value.trim()) {
      setEditing(false)
      return
    }
    setSaving(true)
    try {
      await onSave(draft.trim())
      setEditing(false)
    } catch {
      // parent handles error toast
    } finally {
      setSaving(false)
    }
  }

  const cancel = () => {
    setDraft(value)
    setEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault()
      save()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancel()
    } else if (e.key === 'Enter' && multiline && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      save()
    }
  }

  if (!isOwner) {
    return (
      <span className={className}>
        {value || <span className="text-zinc-600 italic">{placeholder}</span>}
      </span>
    )
  }

  if (editing) {
    const InputTag = multiline ? 'textarea' : 'input'
    return (
      <div className="flex items-start gap-2 w-full">
        <InputTag
          ref={inputRef as any}
          value={draft}
          onChange={(e: any) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={maxLength}
          placeholder={placeholder}
          rows={multiline ? 3 : undefined}
          className={cn(
            'flex-1 bg-zinc-900/60 border border-zinc-700 rounded-lg px-3 py-1.5',
            'text-zinc-200 focus:outline-none focus:border-zinc-600',
            editClassName || className
          )}
        />
        <div className="flex gap-1 flex-shrink-0">
          <button
            onClick={save}
            disabled={saving}
            className="w-7 h-7 flex items-center justify-center bg-white text-black rounded-lg hover:bg-zinc-100 disabled:opacity-50"
          >
            <Check className="w-3.5 h-3.5" weight="bold" />
          </button>
          <button
            onClick={cancel}
            disabled={saving}
            className="w-7 h-7 flex items-center justify-center border border-zinc-700 text-zinc-400 rounded-lg hover:text-zinc-200 hover:border-zinc-600"
          >
            <X className="w-3.5 h-3.5" weight="bold" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className={cn(
        'group inline-flex items-center gap-1.5 rounded-md px-1 -mx-1 hover:bg-zinc-800/40 transition-colors text-left',
        className
      )}
    >
      <span>
        {value || <span className="text-zinc-600 italic">{placeholder}</span>}
      </span>
      {showEditIcon && (
        <PencilSimple
          className="w-3 h-3 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
          weight="bold"
        />
      )}
    </button>
  )
}