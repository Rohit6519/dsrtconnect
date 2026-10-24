'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Heart, MessageCircle } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

interface EditorialEngagementProps {
  postId: string
  initialLikes: number
  initialUserLiked: boolean
  initialComments: any[]
  currentUser: any
}

export function EditorialEngagement({
  postId,
  initialLikes,
  initialUserLiked,
  initialComments,
  currentUser,
}: EditorialEngagementProps) {
  const supabase = createClient()
  const [liked, setLiked] = useState(initialUserLiked)
  const [likeCount, setLikeCount] = useState(initialLikes)
  const [comments, setComments] = useState(initialComments)
  const [text, setText] = useState('')
  const [posting, setPosting] = useState(false)

  const toggleLike = async () => {
    if (!currentUser) return
    if (liked) {
      setLiked(false)
      setLikeCount((c) => c - 1)
      await supabase
        .from('editorial_likes')
        .delete()
        .eq('editorial_post_id', postId)
        .eq('user_id', currentUser.id)
    } else {
      setLiked(true)
      setLikeCount((c) => c + 1)
      await supabase
        .from('editorial_likes')
        .insert({ editorial_post_id: postId, user_id: currentUser.id })
    }
  }

  const postComment = async () => {
    if (!text.trim() || !currentUser) return
    setPosting(true)
    const { data } = await supabase
      .from('editorial_comments')
      .insert({
        editorial_post_id: postId,
        user_id: currentUser.id,
        content: text.trim(),
      })
      .select('*, users(id, full_name, username, avatar_url)')
      .single()

    if (data) {
      setComments([...comments, data])
      setText('')
    }
    setPosting(false)
  }

  return (
    <div className="space-y-4 pt-4 border-t border-border/40">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={toggleLike}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-muted/40 transition-colors',
            liked && 'text-rose-500'
          )}
        >
          <Heart className={cn('w-4 h-4', liked && 'fill-current')} />
          <span className="text-sm">{likeCount}</span>
        </button>

        <div className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground">
          <MessageCircle className="w-4 h-4" />
          <span>{comments.length}</span>
        </div>
      </div>

      {currentUser && (
        <div className="flex gap-2">
          <Avatar className="w-8 h-8 flex-shrink-0">
            <AvatarImage src={currentUser.avatar_url} />
            <AvatarFallback className="text-xs">
              {currentUser.full_name?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 flex gap-2">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') postComment()
              }}
              placeholder="Add a comment..."
              className="flex-1 px-3 py-1.5 text-sm rounded-full bg-muted/40 border-0 focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <Button size="sm" onClick={postComment} disabled={!text.trim() || posting}>
              Post
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {comments.map((c) => (
          <div key={c.id} className="flex gap-2">
            <Avatar className="w-8 h-8 flex-shrink-0">
              <AvatarImage src={c.users?.avatar_url} />
              <AvatarFallback className="text-xs">
                {c.users?.full_name?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 bg-muted/30 rounded-2xl px-3 py-2">
              <p className="text-xs font-semibold">{c.users?.full_name}</p>
              <p className="text-sm">{c.content}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {formatDistanceToNow(new Date(c.created_at), {
                  addSuffix: true,
                })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}