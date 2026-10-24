'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import {
  Loader2,
  Send,
  MoreHorizontal,
  Trash2,
  ShieldCheck,
  Flag,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { formatDistanceToNow } from 'date-fns'
import { toast } from '@/components/ui/sonner'
import { cn } from '@/lib/utils'
import { useCommunityComments } from '@/hooks/useCommunityComments'
import { LoadingState } from '@/components/kernel-ui'
import { ReactionBar } from './ReactionBar'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { ControlledReportModal } from '@/components/community-hub/moderation/ReportModal'
import { ConfirmDialog } from '@/components/ui/reason-prompt-dialog'

interface Props {
  targetType: 'post' | 'announcement' | 'comment'
  targetId: string
  canPost?: boolean
  currentUserId?: string | null
  canModerate?: boolean
  /** community_id needed for the report modal; falls back to top-level if omitted */
  communityId?: string
}

export function CommentThread({
  targetType,
  targetId,
  canPost,
  currentUserId,
  canModerate,
  communityId,
}: Props) {
  const { items, loading, reload } = useCommunityComments(targetType, targetId)
  const [text, setText] = useState('')
  const [pending, startTransition] = useTransition()

  const submit = () => {
    if (!text.trim()) return
    startTransition(async () => {
      const res = await fetch('/api/v1/community/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_type: targetType, target_id: targetId, body: text }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        toast.error(j?.error?.message || 'Comment failed')
        return
      }
      setText('')
      reload()
    })
  }

  return (
    <div className="space-y-3">
      {loading ? (
        <LoadingState variant="compact" label="Loading comments…" />
      ) : items.length === 0 ? (
        <p className="text-[12px] text-white/40 text-center py-2">No comments yet.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((c: any) => (
            <li key={c.id}>
              <CommentRow
                comment={c}
                currentUserId={currentUserId ?? null}
                canModerate={!!canModerate}
                communityId={communityId ?? c.community_id}
                onDeleted={reload}
              />
              {(c.replies || []).length > 0 && (
                <ul className="mt-2 ml-8 space-y-2 border-l border-white/[0.04] pl-4">
                  {c.replies.map((r: any) => (
                    <li key={r.id}>
                      <CommentRow
                        comment={r}
                        nested
                        currentUserId={currentUserId ?? null}
                        canModerate={!!canModerate}
                        communityId={communityId ?? r.community_id}
                        onDeleted={reload}
                      />
                    </li>
                  ))}
                </ul>
              )}
              {canPost && <ReplyBox parentId={c.id} onPosted={reload} />}
            </li>
          ))}
        </ul>
      )}

      {canPost ? (
        <div className="flex items-end gap-2 pt-2 border-t border-white/[0.04]">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            placeholder="Write a comment…"
            className="flex-1 rounded-lg border border-white/[0.06] bg-white/[0.02] focus:border-white/[0.14] outline-none px-3 py-2 text-[12.5px] text-white placeholder:text-white/30 resize-none"
          />
          <button
            onClick={submit}
            disabled={pending || !text.trim()}
            className={cn(
              'inline-flex items-center gap-1 rounded-full bg-white text-black hover:bg-zinc-100 px-3 py-2 text-[11.5px] font-semibold transition-colors',
              (pending || !text.trim()) && 'opacity-60 cursor-not-allowed'
            )}
          >
            {pending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" strokeWidth={2} />}
            Post
          </button>
        </div>
      ) : (
        <p className="text-[11.5px] text-white/40">Join the community to comment.</p>
      )}
    </div>
  )
}

interface CommentRowProps {
  comment: any
  nested?: boolean
  currentUserId: string | null
  canModerate: boolean
  communityId?: string
  onDeleted: () => void
}

function CommentRow({
  comment,
  nested,
  currentUserId,
  canModerate,
  communityId,
  onDeleted,
}: CommentRowProps) {
  const [reportOpen, setReportOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const a = comment.author
  const isOwn = !!currentUserId && comment.author_identity_id === currentUserId
  const canDelete = isOwn || canModerate

  const del = async () => {
    const res = await fetch(`/api/v1/community/comments/${comment.id}`, { method: 'DELETE' })
    if (!res.ok) {
      toast.error('Delete failed')
      throw new Error('delete failed')
    }
    onDeleted()
  }

  return (
    <>
      <div className="flex items-start gap-2.5">
        <Avatar
          className={cn('border border-white/[0.06] flex-shrink-0', nested ? 'w-7 h-7' : 'w-8 h-8')}
        >
          <AvatarImage src={a?.avatar_url ?? undefined} />
          <AvatarFallback className="text-[10px] bg-white/[0.06] text-white/80">
            {(a?.full_name || '?').charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2">
            <div className="flex items-center gap-1.5">
              <Link
                href={`/profile/${a?.username || ''}`}
                className="text-[12px] font-semibold text-white hover:underline"
              >
                {a?.full_name || 'Unknown'}
              </Link>
              {a?.is_verified && <ShieldCheck className="w-3 h-3 text-white/60" strokeWidth={1.75} />}
              <span className="text-[10.5px] text-white/40">
                · {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
              </span>
            </div>
            <p className="mt-1 text-[12.5px] text-white/80 whitespace-pre-wrap leading-relaxed">
              {comment.body}
            </p>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <ReactionBar
              targetType="comment"
              targetId={comment.id}
              myReaction={comment.my_reaction || null}
              count={comment.reaction_count || 0}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-6 h-6 rounded-full text-white/40 hover:text-white hover:bg-white/[0.06] flex items-center justify-center transition-colors">
                  <MoreHorizontal className="w-3.5 h-3.5" strokeWidth={1.75} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-32 bg-[#0f0f14] border-white/[0.08] text-white"
              >
                {!isOwn && communityId && (
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault()
                      setReportOpen(true)
                    }}
                    className="focus:bg-white/[0.06] cursor-pointer"
                  >
                    <Flag className="w-3 h-3 mr-2" strokeWidth={1.75} />
                    Report
                  </DropdownMenuItem>
                )}
                {canDelete && (
                  <>
                    {!isOwn && <DropdownMenuSeparator className="bg-white/[0.06]" />}
                    <DropdownMenuItem
                      onSelect={(e) => {
                        e.preventDefault()
                        setConfirmDelete(true)
                      }}
                      className="focus:bg-white/[0.06] cursor-pointer text-red-300 focus:text-red-200"
                    >
                      <Trash2 className="w-3 h-3 mr-2" strokeWidth={1.75} />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {communityId && (
        <ControlledReportModal
          open={reportOpen}
          onOpenChange={setReportOpen}
          communityId={communityId}
          targetType="comment"
          targetId={comment.id}
        />
      )}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this comment?"
        description={isOwn ? 'This cannot be undone.' : 'This comment will be removed for everyone.'}
        confirmLabel="Delete comment"
        destructive
        onConfirm={del}
      />
    </>
  )
}

function ReplyBox({ parentId, onPosted }: { parentId: string; onPosted: () => void }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [pending, startTransition] = useTransition()

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="ml-11 mt-1 text-[11px] text-white/45 hover:text-white transition-colors"
      >
        Reply
      </button>
    )
  }

  const submit = () => {
    if (!text.trim()) return
    startTransition(async () => {
      const res = await fetch('/api/v1/community/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_type: 'comment', target_id: parentId, body: text }),
      })
      if (!res.ok) {
        toast.error('Reply failed')
        return
      }
      setText('')
      setOpen(false)
      onPosted()
    })
  }

  return (
    <div className="ml-11 mt-2 flex items-end gap-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        placeholder="Reply…"
        className="flex-1 rounded-lg border border-white/[0.06] bg-white/[0.02] focus:border-white/[0.14] outline-none px-3 py-2 text-[12px] text-white placeholder:text-white/30 resize-none"
      />
      <button
        onClick={submit}
        disabled={pending || !text.trim()}
        className={cn(
          'inline-flex items-center gap-1 rounded-full bg-white text-black hover:bg-zinc-100 px-3 py-1.5 text-[11px] font-semibold transition-colors',
          (pending || !text.trim()) && 'opacity-60 cursor-not-allowed'
        )}
      >
        {pending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Reply'}
      </button>
      <button
        onClick={() => setOpen(false)}
        className="text-[11px] text-white/40 hover:text-white px-2 py-1"
      >
        Cancel
      </button>
    </div>
  )
}