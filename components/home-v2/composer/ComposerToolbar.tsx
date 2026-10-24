'use client'

import { useState } from 'react'
import { Hash, X } from '@phosphor-icons/react'
import { useComposer } from './ComposerContext'
import { VisibilityPicker } from './VisibilityPicker'

interface Props {
  onPublish: () => void
  publishing: boolean
  canPublish: boolean
}

const MAX_CHARS = 3000

export function ComposerToolbar({ onPublish, publishing, canPublish }: Props) {
  const composer = useComposer()
  const [tagInput, setTagInput] = useState('')

  const addTagFromInput = () => {
    const t = tagInput.trim().replace(/^#/, '')
    if (t) composer.addTag(t)
    setTagInput('')
  }

  const charCount = composer.content.length
  const overLimit = charCount > MAX_CHARS
  const nearLimit = charCount > MAX_CHARS * 0.9

  return (
    <div className="border-t border-zinc-800 pt-4 space-y-3">
      {/* Tags */}
      <div>
        <div className="flex items-center gap-2">
          <Hash size={11} weight="regular" className="text-zinc-500" />
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault()
                addTagFromInput()
              }
            }}
            onBlur={() => tagInput && addTagFromInput()}
            placeholder="Add tag (press Enter)"
            maxLength={100}
            className="flex-1 h-7 bg-transparent text-[12px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none"
          />
          <span className={
            'text-[10.5px] tabular-nums ' +
            (overLimit ? 'text-red-400' : nearLimit ? 'text-amber-400' : 'text-zinc-600')
          }>
            {charCount}/{MAX_CHARS}
          </span>
        </div>

        {composer.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {composer.tags.map(t => (
              <span
                key={t}
                className="inline-flex items-center gap-1 h-6 pl-2 pr-1 rounded bg-blue-500/10 border border-blue-500/20 text-[11.5px] font-medium text-blue-400"
              >
                #{t}
                <button
                  type="button"
                  onClick={() => composer.removeTag(t)}
                  className="w-4 h-4 rounded flex items-center justify-center hover:bg-blue-500/20"
                >
                  <X size={9} weight="bold" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Bottom actions */}
      <div className="flex items-center justify-between gap-3">
        <VisibilityPicker />

        <button
          type="button"
          onClick={onPublish}
          disabled={!canPublish || publishing || overLimit}
          className={
            'inline-flex items-center h-10 px-6 rounded-md font-bold text-[13px] transition-all ' +
            (canPublish && !publishing && !overLimit
              ? 'bg-white text-black hover:bg-zinc-100 shadow-[0_2px_8px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.5)]'
              : 'bg-zinc-800 text-zinc-500 cursor-not-allowed')
          }
        >
          {publishing ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 border-2 border-black/20 border-t-black rounded-full animate-spin" />
              Publishing...
            </span>
          ) : (
            'Post'
          )}
        </button>
      </div>
    </div>
  )
}