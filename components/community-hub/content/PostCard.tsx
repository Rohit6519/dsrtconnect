'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import {
  Pin, Trash2, MoreHorizontal, MessageSquare, ExternalLink, ShieldCheck, Flag,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { toast } from '@/components/ui/sonner'
import { PollWidget } from './PollWidget'
import { ReactionBar } from './ReactionBar'
import { CommentThread } from './CommentThread'
import { ControlledReportModal } from '@/components/community-hub/moderation/ReportModal'
import { ConfirmDialog } from '@/components/ui/reason-prompt-dialog'
import { DsrtPanel, DsrtAvatar } from '@/components/dsrt'
import { cn } from '@/lib/utils'

interface Props {
  post: any
  slug: string
  currentUserId?: string | null
  canModerate?: boolean
  canPost?: boolean
  onDeleted?: (id: string) => void
}

export function PostCard({
  post,
  slug,
  currentUserId,
  canModerate,
  canPost,
  onDeleted,
}: Props) {
  const [showComments, setShowComments] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const author = post.author

  const isOwn = !!currentUserId && post.author_identity_id === currentUserId
  const canDelete = isOwn || !!canModerate
  const isPinned = !!post.pinned_at

  const del = async () => {
    const res = await fetch(`/api/v1/community/posts/${post.id}`, { method: 'DELETE' })
    if (!res.ok) {
      toast.error('Delete failed')
      throw new Error('delete failed')
    }
    toast.success('Post deleted')
    onDeleted?.(post.id)
  }

  const togglePin = async () => {
    const nextPin = !post.pinned_at
    const res = await fetch(`/api/v1/community/posts/${post.id}/pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: nextPin }),
    })
    if (!res.ok) {
      toast.error('Pin failed')
      return
    }
    toast.success(nextPin ? 'Pinned' : 'Unpinned')
  }

  return (
    <>
      <DsrtPanel padding="none" className="overflow-hidden mb-4">
        {isPinned && (
          <div className="flex items-center gap-1.5 border-b border-white/[0.04] bg-[#1e3a5f]/20 px-4 py-2">
            <Pin className="w-3.5 h-3.5 text-[#93c5fd]" strokeWidth={2} />
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#93c5fd]">
              Pinned by moderators
            </span>
          </div>
        )}

        <div className="p-4 md:p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <DsrtAvatar src={author?.avatar_url} name={author?.full_name} size="md" />
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[14px] font-bold text-white truncate max-w-[200px]">
                    {author?.full_name || 'Unknown'}
                  </span>
                  {author?.is_verified && (
                    <ShieldCheck className="w-3.5 h-3.5 text-[#93c5fd]" strokeWidth={2} />
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-white/40 mt-0.5">
                  <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                  {post.edited_at && <span>· edited</span>}
                </div>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-8 h-8 rounded-full text-white/40 hover:text-white hover:bg-white/[0.08] flex items-center justify-center transition-colors -mr-2 -mt-1">
                  <MoreHorizontal className="w-5 h-5" strokeWidth={2} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 bg-[#0a0f1a] border-white/[0.08] text-white rounded-xl shadow-2xl py-1">
                {canModerate && (
                  <DropdownMenuItem onSelect={togglePin} className="focus:bg-white/[0.08] cursor-pointer text-[13px] py-2">
                    <Pin className="w-4 h-4 mr-2" /> {isPinned ? 'Unpin' : 'Pin'}
                  </DropdownMenuItem>
                )}
                {!isOwn && (
                  <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setReportOpen(true) }} className="focus:bg-white/[0.08] cursor-pointer text-[13px] py-2">
                    <Flag className="w-4 h-4 mr-2" /> Report
                  </DropdownMenuItem>
                )}
                {canDelete && (
                  <>
                    {(canModerate || !isOwn) && <DropdownMenuSeparator className="bg-white/[0.06]" />}
                    <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setConfirmDelete(true) }} className="focus:bg-red-500/20 cursor-pointer text-red-400 focus:text-red-300 text-[13px] py-2">
                      <Trash2 className="w-4 h-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div>
            {post.title && <h3 className="text-[16px] font-bold text-white leading-snug mb-2">{post.title}</h3>}
            {post.body && <p className="text-[14px] text-white/80 leading-relaxed whitespace-pre-wrap">{post.body}</p>}
          </div>

          {post.attachments && post.attachments.length > 0 && (
            <div className={cn('grid gap-2', post.attachments.length === 1 ? 'grid-cols-1' : 'grid-cols-2')}>
              {post.attachments.slice(0, 4).map((a: any) => (
                <div key={a.id} className="rounded-xl border border-white/[0.08] bg-black/40 overflow-hidden">
                  {a.url && (a.attachment_type === 'IMAGE' || a.attachment_type?.startsWith('image')) && (
                    <img src={a.url} alt="" className="w-full h-auto object-cover max-h-96" />
                  )}
                </div>
              ))}
            </div>
          )}

          {post.link_url && (
            <a
              href={post.link_url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] transition-colors p-3 mt-2 group"
            >
              <div className="w-8 h-8 rounded-lg bg-white/[0.05] flex items-center justify-center shrink-0 text-white/50 group-hover:text-white">
                <ExternalLink className="w-4 h-4" />
              </div>
              <span className="text-[13px] font-medium text-white/70 group-hover:text-white truncate">
                {post.link_url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
              </span>
            </a>
          )}

          {post.poll && <PollWidget poll={post.poll} canVote={!!canPost} />}
        </div>

        <div className="border-t border-white/[0.04] px-4 md:px-5 py-3 flex items-center justify-between bg-white/[0.01]">
          <ReactionBar targetType="post" targetId={post.id} myReaction={post.my_reaction || null} count={post.reaction_count || 0} />
          <button
            onClick={() => setShowComments((v) => !v)}
            className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-white/70 hover:text-white px-3 py-1.5 text-[12px] font-semibold transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            {post.comment_count || 0} Comments
          </button>
        </div>

        {showComments && (
          <div className="border-t border-white/[0.04] px-4 md:px-5 py-4">
            <CommentThread targetType="post" targetId={post.id} canPost={!!canPost} currentUserId={currentUserId ?? null} canModerate={!!canModerate} />
          </div>
        )}
      </DsrtPanel>

      <ControlledReportModal open={reportOpen} onOpenChange={setReportOpen} communityId={post.community_id} targetType="post" targetId={post.id} />
      <ConfirmDialog open={confirmDelete} onOpenChange={setConfirmDelete} title="Delete this post?" description={isOwn ? 'This cannot be undone.' : 'You are moderating this post. It will be removed for everyone.'} confirmLabel="Delete post" destructive onConfirm={del} />
    </>
  )
}