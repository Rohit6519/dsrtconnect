'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Warning } from '@phosphor-icons/react'
import { PostDetailContent } from './PostDetailContent'
import { PostContextSidebar } from './PostContextSidebar'
import { CommentPanel } from '../interactions/CommentPanel'

interface Props {
  postId: string
  currentUser: any
}

export function PostDetailPage({ postId, currentUser }: Props) {
  const router = useRouter()
  const [post, setPost] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showComments, setShowComments] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/posts/${postId}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Post not found')
      }
      const data = await res.json()
      setPost(data.post)
    } catch (e: any) {
      setError(e?.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [postId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!post?.id) return
    const enter = Date.now()
    const sid = typeof window !== 'undefined'
      ? (sessionStorage.getItem('dsrt_sid') || (() => {
          const s = 'sid_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10)
          sessionStorage.setItem('dsrt_sid', s)
          return s
        })())
      : undefined
    fetch(`/api/posts/${post.id}/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sid, source: 'detail' }),
    }).catch(() => {})
    return () => {
      const dwell = Date.now() - enter
      if (dwell > 2000 && typeof navigator !== 'undefined' && navigator.sendBeacon) {
        try {
          navigator.sendBeacon(
            `/api/posts/${post.id}/view`,
            new Blob([JSON.stringify({ session_id: sid, dwell_ms: dwell })], { type: 'application/json' })
          )
        } catch {}
      }
    }
  }, [post?.id])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] text-zinc-100">
        <div className="max-w-[900px] mx-auto px-4 md:px-6 py-8">
          <div className="h-6 w-32 bg-zinc-900 rounded mb-6 animate-pulse" />
          <div className="h-96 bg-zinc-900 rounded-xl animate-pulse" />
        </div>
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
        <div className="text-center max-w-md">
          <Warning size={22} className="mx-auto mb-3 text-zinc-500" />
          <h1 className="text-[18px] font-bold text-white mb-1.5 tracking-tight">{error || 'Post not found'}</h1>
          <p className="text-[13px] text-zinc-500 mb-5">The post may have been deleted or is not available.</p>
          <Link href="/home" className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-zinc-800 hover:border-zinc-700 text-[13px] font-medium text-zinc-300 hover:text-white">
            <ArrowLeft size={12} weight="bold" />Back to Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-zinc-100">
      <div className="max-w-[900px] mx-auto px-4 md:px-6 py-6">
        <button onClick={() => router.back()} className="inline-flex items-center gap-1.5 text-[12.5px] text-zinc-400 hover:text-white transition-colors mb-4">
          <ArrowLeft size={12} weight="bold" />Back
        </button>
        <PostDetailContent post={post} currentUser={currentUser} onOpenComments={() => setShowComments(true)} onPostUpdate={(updated: any) => setPost(updated)} />
      </div>
      {showComments && (
        <CommentPanel postId={post.id} currentUser={currentUser} onClose={() => setShowComments(false)}
          onCommentCountChange={(delta: number) => setPost((p: any) => ({ ...p, comment_count: Math.max(0, (p.comment_count || 0) + delta) }))} />
      )}
    </div>
  )
}