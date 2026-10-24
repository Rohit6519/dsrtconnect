'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { MessageSquare, Search, Plus } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

export function MessagesInbox({ conversations: initial, currentUserId }: any) {
  const [conversations, setConversations] = useState(initial)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('inbox-updates')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, () => {
        // Refresh conversations list on new message
        window.location.reload()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const filtered = conversations.filter((c: any) => {
    if (!search) return true
    const other = c.other_participants?.[0]
    const name = c.name || other?.full_name || ''
    const content = c.last_message?.content || ''
    return name.toLowerCase().includes(search.toLowerCase())
      || content.toLowerCase().includes(search.toLowerCase())
  })

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {conversations.length} {conversations.length === 1 ? 'conversation' : 'conversations'}
          </p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search messages..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card border rounded-2xl p-12 text-center">
          <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm font-semibold">No messages yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Start a conversation by visiting someone's profile
          </p>
        </div>
      ) : (
        <div className="bg-card border rounded-2xl overflow-hidden divide-y">
          {filtered.map((conv: any) => {
            const other = conv.other_participants?.[0]
            const displayName = conv.name || other?.full_name || 'Unknown'
            const avatar = conv.avatar_url || other?.avatar_url
            const initial = displayName?.[0]?.toUpperCase()
            const preview = conv.last_message?.content || 'No messages yet'
            const isYou = conv.last_message?.sender_id === currentUserId
            const time = conv.last_message?.created_at || conv.created_at

            return (
              <Link
                key={conv.id}
                href={`/messages/${conv.id}`}
                className="flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors"
              >
                <Avatar className="w-12 h-12">
                  <AvatarImage src={avatar} />
                  <AvatarFallback>{initial}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={cn(
                      'text-sm truncate',
                      conv.unread_count > 0 ? 'font-bold' : 'font-medium'
                    )}>
                      {displayName}
                    </p>
                    <p className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(time), { addSuffix: true })}
                    </p>
                  </div>
                  <p className={cn(
                    'text-xs truncate mt-0.5',
                    conv.unread_count > 0 ? 'text-foreground' : 'text-muted-foreground'
                  )}>
                    {isYou && 'You: '}{preview}
                  </p>
                </div>
                {conv.unread_count > 0 && (
                  <span className="min-w-[20px] h-5 px-1.5 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center font-bold">
                    {conv.unread_count > 99 ? '99+' : conv.unread_count}
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}