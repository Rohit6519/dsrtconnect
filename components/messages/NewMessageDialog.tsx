'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Search, Loader2 } from 'lucide-react'

interface NewMessageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentUserId: string
}

export function NewMessageDialog({
  open,
  onOpenChange,
  currentUserId,
}: NewMessageDialogProps) {
  const router = useRouter()
  const supabase = createClient()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      const { data } = await supabase
        .from('users')
        .select('id, username, full_name, avatar_url, tagline')
        .or(`full_name.ilike.%${query}%,username.ilike.%${query}%`)
        .neq('id', currentUserId)
        .eq('onboarding_complete', true)
        .limit(10)
      setResults(data || [])
      setLoading(false)
    }, 300)

    return () => clearTimeout(timer)
  }, [query, currentUserId])

  const startConversation = async (otherUserId: string) => {
    setLoading(true)
    try {
      const { error } = await supabase.rpc('get_or_create_dm_conversation', {
        other_user_id: otherUserId,
      })

      if (error) {
        console.error('RPC error:', error)
        alert('Could not start conversation: ' + error.message)
      } else {
        onOpenChange(false)
        setQuery('')
        setResults([])
        router.refresh()
      }
    } catch (err: any) {
      console.error(err)
      alert('Error: ' + err.message)
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New message</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search builders by name or @username..."
              className="pl-9"
              autoFocus
            />
          </div>

          <div className="max-h-96 overflow-y-auto space-y-1">
            {loading ? (
              <div className="text-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mx-auto" />
              </div>
            ) : query.length < 2 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Type at least 2 characters to search
              </p>
            ) : results.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No builders found
              </p>
            ) : (
              results.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => startConversation(u.id)}
                  disabled={loading}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/40 transition-colors text-left disabled:opacity-50"
                >
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={u.avatar_url} />
                    <AvatarFallback>
                      {u.full_name?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {u.full_name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      @{u.username}
                      {u.tagline && ` · ${u.tagline}`}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}