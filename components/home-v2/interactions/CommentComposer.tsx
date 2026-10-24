'use client'

import { useState } from 'react'
import { PaperPlaneTilt } from '@phosphor-icons/react'

interface Props {
  currentUser: any
  onSubmit: (content: string) => Promise<void>
  placeholder?: string
  compact?: boolean
}

export function CommentComposer({ currentUser, onSubmit, placeholder = 'Add a comment...', compact }: Props) {
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!content.trim() || submitting) return
    setSubmitting(true)
    try {
      await onSubmit(content.trim())
      setContent('')
    } catch {}
    setSubmitting(false)
  }

  return (
    <div className={
      'flex gap-2.5 ' +
      (compact ? 'items-center' : 'items-start')
    }>
      <div className={
        'shrink-0 rounded-full overflow-hidden bg-zinc-900 border border-zinc-800 flex items-center justify-center ' +
        (compact ? 'w-7 h-7' : 'w-9 h-9')
      }>
        {currentUser?.avatar_url ? (
          <img src={currentUser.avatar_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className={compact ? 'text-[10px] font-bold text-zinc-400' : 'text-[11px] font-bold text-zinc-400'}>
            {(currentUser?.full_name || '?').charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      <div className="flex-1 flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-full px-3 py-1 focus-within:border-zinc-700 transition-colors">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              handleSubmit()
            }
          }}
          placeholder={placeholder}
          rows={1}
          className="flex-1 bg-transparent text-[13px] text-zinc-100 placeholder:text-zinc-500 focus:outline-none resize-none py-1.5 max-h-32"
          disabled={submitting}
        />

        <button
          onClick={handleSubmit}
          disabled={!content.trim() || submitting}
          className={
            'shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all ' +
            (content.trim() && !submitting
              ? 'bg-white text-black hover:bg-zinc-100'
              : 'bg-zinc-800 text-zinc-600 cursor-not-allowed')
          }
        >
          <PaperPlaneTilt size={13} weight="fill" />
        </button>
      </div>
    </div>
  )
}