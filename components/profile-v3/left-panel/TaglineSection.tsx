'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { RichEditorLite } from '../shared/RichEditorLite'
import { Button } from '@/components/ui/button'
import { PencilSimple, X, Check } from '@phosphor-icons/react'

interface TaglineSectionProps {
  taglinePlain: string | null
  taglineHtml: string | null
  isOwner: boolean
  onTaglineChange: (plain: string, html: string) => void
}

export function TaglineSection({
  taglinePlain,
  taglineHtml,
  isOwner,
  onTaglineChange,
}: TaglineSectionProps) {
  const [editing, setEditing] = useState(false)
  const [draftHtml, setDraftHtml] = useState(taglineHtml || '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setDraftHtml(taglineHtml || '')
  }, [taglineHtml])

  const stripHtml = (html: string): string => {
    const tmp = document.createElement('div')
    tmp.innerHTML = html
    return tmp.textContent || tmp.innerText || ''
  }

  const save = async () => {
    const plain = stripHtml(draftHtml).trim()
    if (plain.length > 300) {
      toast.error('Tagline too long (max 300 characters)')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/profile/tagline', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plain, html: draftHtml }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed' }))
        throw new Error(err.error || 'Failed')
      }
      onTaglineChange(plain, draftHtml)
      toast.success('Tagline updated')
      setEditing(false)
    } catch (err: any) {
      toast.error(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const cancel = () => {
    setDraftHtml(taglineHtml || '')
    setEditing(false)
  }

  // View mode (visitor OR owner not editing)
  if (!editing) {
    // Render HTML if present, else plain text
    if (taglineHtml && stripHtml(taglineHtml).trim()) {
      return (
        <div className="group relative">
          <div
            className="text-[13.5px] text-zinc-300 leading-[1.55]
              [&_a]:text-blue-400 [&_a]:underline [&_a]:decoration-blue-400/40
              [&_strong]:text-white [&_b]:text-white
              [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1
              [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1
              [&_li]:my-0.5"
            dangerouslySetInnerHTML={{ __html: taglineHtml }}
          />
          {isOwner && (
            <button
              onClick={() => setEditing(true)}
              className="absolute -top-1 -right-1 w-6 h-6 rounded-md bg-zinc-800/80 border border-zinc-700 text-zinc-500 hover:text-zinc-200 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              title="Edit tagline"
            >
              <PencilSimple className="w-3 h-3" weight="bold" />
            </button>
          )}
        </div>
      )
    }

    // Empty state
    if (isOwner) {
      return (
        <button
          onClick={() => setEditing(true)}
          className="text-[13px] text-zinc-600 italic hover:text-zinc-400 transition-colors text-left w-full leading-relaxed"
        >
          + Add a tagline — describe what you build in one line
        </button>
      )
    }
    return null
  }

  // Edit mode
  return (
    <div className="space-y-2">
      <RichEditorLite
        value={draftHtml}
        onChange={setDraftHtml}
        placeholder="Building the future of..."
        toolbar="standard"
        minHeight="60px"
      />
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={cancel}
          disabled={saving}
          className="h-7 text-xs border-zinc-700 bg-transparent text-zinc-400 hover:text-zinc-200"
        >
          <X className="w-3 h-3 mr-1" weight="bold" /> Cancel
        </Button>
        <Button
          size="sm"
          onClick={save}
          disabled={saving}
          className="h-7 text-xs bg-white text-black hover:bg-zinc-100"
        >
          <Check className="w-3 h-3 mr-1" weight="bold" />
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  )
}