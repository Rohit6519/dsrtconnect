'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, CaretDown } from '@phosphor-icons/react'
import { CommentComposer } from './CommentComposer'
import { CommentItem } from './CommentItem'

interface Props {
  postId: string
  currentUser: any
  onClose: () => void
  onCommentCountChange?: (delta: number) => void
}

export function CommentPanel({ postId, currentUser, onClose, onCommentCountChange }: Props) {
  const [comments, setComments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState<'latest' | 'top'>('latest')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/posts/${postId}/comments?sort=${sort}`)
      const data = await res.json()
      setComments(data.comments || [])
    } catch {} finally {
      setLoading(false)
    }
  }, [postId, sort])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const handleSubmit = async (content: string) => {
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      if (data.comment) {
        setComments(prev => [data.comment, ...prev])
        onCommentCountChange?.(1)
      }
    } catch {}
  }

  const handleReplyPosted = (parentId: string, reply: any) => {
    setComments(prev => prev.map(c =>
      c.id === parentId ? { ...c, replies: [...(c.replies || []), reply] } : c
    ))
    onCommentCountChange?.(1)
  }

  const handleDeleted = (commentId: string) => {
    setComments(prev => {
      // Try top level first
      const filtered = prev.filter(c => c.id !== commentId)
      if (filtered.length !== prev.length) {
        onCommentCountChange?.(-1)
        return filtered
      }
      // Nested reply
      return prev.map(c => ({
        ...c,
        replies: (c.replies || []).filter((r: any) => {
          const keep = r.id !== commentId
          if (!keep) onCommentCountChange?.(-1)
          return keep
        }),
      }))
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <aside
        className={
          'relative ml-auto w-full max-w-lg h-full ' +
          'bg-[#0a0a0b] border-l border-zinc-800 shadow-[-8px_0_40px_rgba(0,0,0,0.6)] ' +
          'flex flex-col animate-in slide-in-from-right duration-200'
        }
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h2 className="text-[15px] font-bold text-white tracking-tight">Comments</h2>
          <div className="flex items-center gap-2">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as any)}
              className="text-[11.5px] font-semibold text-zinc-300 bg-zinc-950 border border-zinc-800 rounded-md h-7 px-2 focus:outline-none cursor-pointer"
            >
              <option value="latest">Latest</option>
              <option value="top">Top</option>
            </select>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-900 flex items-center justify-center"
            >
              <X size={14} weight="bold" />
            </button>
          </div>
        </div>

        {/* Composer */}
        <div className="shrink-0 p-4 border-b border-zinc-800">
          <CommentComposer currentUser={currentUser} onSubmit={handleSubmit} />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {loading ? (
            [0, 1, 2].map(i => (
              <div key={i} className="h-16 rounded-lg bg-zinc-900/50 animate-pulse" />
            ))
          ) : comments.length === 0 ? (
            <p className="text-center text-[12.5px] text-zinc-500 py-8">
              No comments yet. Be the first.
            </p>
          ) : (
            comments.map(c => (
              <CommentItem
                key={c.id}
                postId={postId}
                comment={c}
                currentUser={currentUser}
                onReplyPosted={handleReplyPosted}
                onDeleted={handleDeleted}
              />
            ))
          )}
        </div>
      </aside>
    </div>
  )
}