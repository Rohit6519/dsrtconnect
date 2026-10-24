'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Plus } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface ProjectBuildLogsProps {
  projectId: string
  logs: any[]
  isMember: boolean
  currentUserId?: string
}

export function ProjectBuildLogs({
  projectId,
  logs,
  isMember,
  currentUserId,
}: ProjectBuildLogsProps) {
  const router = useRouter()
  const supabase = createClient()

  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [posting, setPosting] = useState(false)

  const handlePost = async () => {
    if (!title.trim() || !content.trim() || !currentUserId) return
    setPosting(true)

    await supabase.from('project_build_logs').insert({
      project_id: projectId,
      user_id: currentUserId,
      title: title.trim(),
      content: content.trim(),
    })

    setTitle('')
    setContent('')
    setShowForm(false)
    setPosting(false)
    router.refresh()
  }

  return (
    <div className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Build Logs</h2>
        {isMember && !showForm && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" />
            Post Update
          </Button>
        )}
      </div>

      {showForm && (
        <div className="space-y-3 p-4 rounded-xl border border-border/40 bg-background/40">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What did you ship?"
            maxLength={120}
          />
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Describe what you built, learned, or what comes next..."
            rows={4}
            maxLength={2000}
          />
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowForm(false)
                setTitle('')
                setContent('')
              }}
              disabled={posting}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handlePost}
              disabled={!title.trim() || !content.trim() || posting}
            >
              {posting ? 'Posting...' : 'Post'}
            </Button>
          </div>
        </div>
      )}

      {logs.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          No build logs yet. Share what you ship.
        </p>
      ) : (
        <div className="space-y-4">
          {logs.map((log) => (
            <div
              key={log.id}
              className="pb-4 border-b border-border/40 last:border-0"
            >
              <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
                <Avatar className="w-5 h-5">
                  <AvatarImage src={log.users?.avatar_url} />
                  <AvatarFallback className="text-[10px]">
                    {log.users?.full_name?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span>{log.users?.full_name}</span>
                <span>•</span>
                <span>
                  {formatDistanceToNow(new Date(log.created_at), {
                    addSuffix: true,
                  })}
                </span>
              </div>
              <h3 className="font-semibold">{log.title}</h3>
              <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap leading-relaxed">
                {log.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}