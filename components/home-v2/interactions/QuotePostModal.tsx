'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { X, Quotes, CheckCircle } from '@phosphor-icons/react'

interface Props {
  post: any
  currentUser: any
  onClose: () => void
  onSuccess: () => void
}

const MAX = 800

export function QuotePostModal({ post, currentUser, onClose, onSuccess }: Props) {
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && !submitting && onClose()
    window.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [onClose, submitting])

  const submit = async () => {
    if (!content.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/posts/${post.id}/repost`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publisher_type: 'person',
          publisher_id: currentUser.id,
          quote_content: content.trim(),
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to post')
      }
      onSuccess()
    } catch (e: any) {
      setError(e?.message || 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const publisher = post.publisher
  const publisherHref = publisher?.type === 'venture'
    ? `/ventures/${publisher.slug}`
    : `/profile/${publisher?.handle}`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={!submitting ? onClose : undefined}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-xl rounded-2xl border border-zinc-800 bg-[#0a0a0b] overflow-hidden shadow-[0_20px_80px_rgba(0,0,0,0.7)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Quotes size={14} weight="regular" className="text-zinc-400" />
            <h2 className="text-[15px] font-bold text-white tracking-tight">Quote post</h2>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="w-8 h-8 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-900 flex items-center justify-center disabled:opacity-40"
          >
            <X size={14} weight="bold" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Composer */}
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-900 border border-zinc-800 shrink-0 flex items-center justify-center">
              {currentUser?.avatar_url ? (
                <img src={currentUser.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[12px] font-bold text-zinc-400">
                  {(currentUser?.full_name || '?').charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Add your thoughts..."
              rows={3}
              maxLength={MAX}
              autoFocus
              disabled={submitting}
              className="flex-1 bg-transparent text-[14.5px] text-zinc-100 placeholder:text-zinc-500 focus:outline-none resize-none leading-relaxed"
            />
          </div>

          {/* Embedded original post */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className={
                'w-7 h-7 overflow-hidden bg-zinc-900 border border-zinc-800 flex items-center justify-center ' +
                (publisher?.type === 'venture' ? 'rounded-md' : 'rounded-full')
              }>
                {publisher?.avatar_url ? (
                  <img src={publisher.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[10px] font-bold text-zinc-400">
                    {publisher?.name?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                )}
              </div>
              <div className="text-[12.5px] font-bold text-white truncate">
                {publisher?.name}
              </div>
              {publisher?.is_verified && (
                <CheckCircle size={11} weight="fill" className="text-blue-400 shrink-0" />
              )}
              <div className="text-[11px] text-zinc-500 truncate">
                @{publisher?.handle}
              </div>
            </div>
            <p className="text-[12.5px] text-zinc-300 leading-relaxed line-clamp-3">
              {post.content}
            </p>
          </div>

          {error && (
            <p className="text-[12px] text-red-400">{error}</p>
          )}
        </div>

        <div className="px-5 py-3 border-t border-zinc-800 flex items-center justify-between">
          <span className={
            'text-[11px] tabular-nums ' +
            (content.length > MAX * 0.9 ? 'text-amber-400' : 'text-zinc-500')
          }>
            {content.length}/{MAX}
          </span>
          <button
            onClick={submit}
            disabled={!content.trim() || submitting}
            className={
              'inline-flex items-center h-9 px-5 rounded-lg text-[13px] font-bold transition-all ' +
              (content.trim() && !submitting
                ? 'bg-white text-black hover:bg-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]'
                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed')
            }
          >
            {submitting ? 'Posting...' : 'Post quote'}
          </button>
        </div>
      </div>
    </div>
  )
}