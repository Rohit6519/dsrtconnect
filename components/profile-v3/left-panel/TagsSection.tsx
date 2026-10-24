'use client'

import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, MagnifyingGlass, Spinner } from '@phosphor-icons/react'

interface TagsSectionProps {
  tags: string[]
  isOwner: boolean
  onTagsChange: (tags: string[]) => void
}

const MAX_TAGS = 12

export function TagsSection({ tags, isOwner, onTagsChange }: TagsSectionProps) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Load suggestions when query changes
  useEffect(() => {
    if (!pickerOpen) return
    if (timerRef.current) clearTimeout(timerRef.current)
    setLoading(true)
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/profile/tags/suggest?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        // Filter out tags user already has
        const existing = new Set(tags.map((t) => t.toLowerCase()))
        setSuggestions((data.tags || []).filter((t: string) => !existing.has(t.toLowerCase())))
      } catch {
        setSuggestions([])
      } finally {
        setLoading(false)
      }
    }, 200)

    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [query, pickerOpen, tags])

  // Focus input when opened
  useEffect(() => {
    if (pickerOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [pickerOpen])

  // Close on outside click
  useEffect(() => {
    if (!pickerOpen) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setPickerOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [pickerOpen])

  // Save array to backend
  const persistTags = async (newTags: string[]) => {
    setSaving(true)
    try {
      const res = await fetch('/api/profile/tags', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: newTags }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed' }))
        throw new Error(err.error || 'Failed')
      }
      const data = await res.json()
      onTagsChange(data.tags)
    } catch (err: any) {
      toast.error(err.message || 'Failed to update tags')
    } finally {
      setSaving(false)
    }
  }

  const addTag = (tag: string) => {
    const trimmed = tag.trim()
    if (!trimmed) return
    if (trimmed.length > 40) {
      toast.error('Tag too long (max 40 chars)')
      return
    }
    if (tags.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
      toast.error('Tag already added')
      return
    }
    if (tags.length >= MAX_TAGS) {
      toast.error(`Max ${MAX_TAGS} tags`)
      return
    }
    const newTags = [...tags, trimmed]
    persistTags(newTags)
    setQuery('')
    inputRef.current?.focus()
  }

  const removeTag = (tag: string) => {
    const newTags = tags.filter((t) => t.toLowerCase() !== tag.toLowerCase())
    persistTags(newTags)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (suggestions.length > 0) {
        addTag(suggestions[0])
      } else if (query.trim()) {
        addTag(query.trim())
      }
    } else if (e.key === 'Escape') {
      setPickerOpen(false)
      setQuery('')
    } else if (e.key === 'Backspace' && !query && tags.length > 0) {
      removeTag(tags[tags.length - 1])
    }
  }

  const hasContent = tags.length > 0 || isOwner

  if (!hasContent) return null

  return (
    <div ref={containerRef} className="relative">
      <div className="flex flex-wrap gap-1.5 items-center">
        {tags.map((tag) => (
          <TagPill key={tag} tag={tag} isOwner={isOwner} onRemove={() => removeTag(tag)} />
        ))}

        {/* + Add Tag button (owner only) */}
        {isOwner && tags.length < MAX_TAGS && (
          <button
            onClick={() => setPickerOpen((v) => !v)}
            className={cn(
              'inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg border border-dashed transition-colors',
              pickerOpen
                ? 'border-white text-white bg-zinc-800/60'
                : 'border-zinc-700 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'
            )}
            title="Add tag"
          >
            <Plus className="w-3 h-3" weight="bold" />
            {tags.length === 0 ? 'Add tags' : 'Add'}
          </button>
        )}
      </div>

      {/* Picker dropdown */}
      <AnimatePresence>
        {pickerOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute top-full left-0 right-0 mt-2 z-40 bg-zinc-950 border border-zinc-800 rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.5)] overflow-hidden"
          >
            {/* Search input */}
            <div className="relative border-b border-zinc-800/60">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" weight="bold" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search or type a new tag..."
                className="w-full h-10 pl-8 pr-8 text-[13px] bg-transparent text-zinc-200 placeholder:text-zinc-600 focus:outline-none"
              />
              {loading && (
                <Spinner className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 animate-spin" weight="bold" />
              )}
            </div>

            {/* Suggestions */}
            <div className="max-h-56 overflow-y-auto">
              {suggestions.length === 0 && !query && !loading && (
                <p className="text-[11px] text-zinc-600 text-center py-4">
                  Start typing to see suggestions
                </p>
              )}

              {suggestions.length > 0 && (
                <div className="p-2 flex flex-wrap gap-1.5">
                  {suggestions.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => addTag(tag)}
                      className="text-[11px] px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200 transition-colors"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}

              {/* Create new option */}
              {query.trim() && !suggestions.some((s) => s.toLowerCase() === query.trim().toLowerCase()) && (
                <button
                  onClick={() => addTag(query.trim())}
                  className="w-full text-left px-3 py-2.5 text-[12px] text-blue-400 hover:bg-zinc-900 border-t border-zinc-800/60 flex items-center gap-2"
                >
                  <Plus className="w-3 h-3" weight="bold" />
                  Create <span className="font-semibold">&ldquo;{query.trim()}&rdquo;</span>
                </button>
              )}
            </div>

            {saving && (
              <div className="border-t border-zinc-800/60 px-3 py-1.5 text-[10px] text-zinc-500 flex items-center gap-1.5">
                <Spinner className="w-3 h-3 animate-spin" weight="bold" /> Saving...
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function TagPill({
  tag,
  isOwner,
  onRemove,
}: {
  tag: string
  isOwner: boolean
  onRemove: () => void
}) {
  return (
    <span className="group inline-flex items-center gap-1 text-[11px] px-2 py-0.5 bg-blue-500/10 text-blue-300 border border-blue-500/20 rounded-lg font-medium">
      {tag}
      {isOwner && (
        <button
          onClick={onRemove}
          className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all"
          title="Remove"
        >
          <X className="w-2.5 h-2.5" weight="bold" />
        </button>
      )}
    </span>
  )
}