'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bell, CheckCircle, XCircle, Clock, ChatCircle, Handshake } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface VentureNotificationsProps {
  ventureId: string
}

export function VentureNotifications({ ventureId }: VentureNotificationsProps) {
  const supabase = createClient()
  const [connections, setConnections] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'declined'>('pending')

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('venture_connections')
        .select(`
          *,
          users:user_id (
            id, full_name, username, avatar_url, tagline, brings
          )
        `)
        .eq('venture_id', ventureId)
        .order('created_at', { ascending: false })

      setConnections(data || [])
      setLoading(false)
    }
    load()
  }, [ventureId])

  const handleAccept = async (id: string) => {
    const { error } = await supabase
      .from('venture_connections')
      .update({
        status: 'accepted',
        responded_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      toast.error('Failed to accept')
    } else {
      setConnections(connections.map(c => c.id === id ? { ...c, status: 'accepted' } : c))
      toast.success('Connection accepted')
    }
  }

  const handleDecline = async (id: string) => {
    const { error } = await supabase
      .from('venture_connections')
      .update({
        status: 'declined',
        responded_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      toast.error('Failed to decline')
    } else {
      setConnections(connections.map(c => c.id === id ? { ...c, status: 'declined' } : c))
      toast.success('Connection declined')
    }
  }

  const filtered = filter === 'all' ? connections : connections.filter(c => c.status === filter)
  const pendingCount = connections.filter(c => c.status === 'pending').length

  if (loading) {
    return (
      <div className="bg-card border rounded-2xl p-12 text-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-2xl p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <Bell className="w-5 h-5 text-blue-500" weight="fill" />
          </div>
          <div className="flex-1">
            <h2 className="font-bold">Notifications</h2>
            <p className="text-xs text-muted-foreground">
              {pendingCount > 0 
                ? `${pendingCount} pending connection ${pendingCount === 1 ? 'request' : 'requests'}` 
                : 'All caught up'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border rounded-xl p-1 flex gap-1 w-fit">
        {(['pending', 'accepted', 'declined', 'all'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors',
              filter === f
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {f}
            {f === 'pending' && pendingCount > 0 && (
              <span className="ml-1 bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Connections list */}
      {filtered.length === 0 ? (
        <div className="bg-card border rounded-2xl p-12 text-center">
          <Bell className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" weight="duotone" />
          <p className="text-sm font-semibold">No {filter !== 'all' ? filter : ''} notifications</p>
          <p className="text-xs text-muted-foreground mt-1">
            When people request to connect, they'll appear here
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filtered.map((conn) => (
              <motion.div
                key={conn.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="bg-card border rounded-2xl p-5"
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  {conn.users?.avatar_url ? (
                    <img
                      src={conn.users.avatar_url}
                      alt={conn.users.full_name}
                      className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                      {conn.users?.full_name?.[0]?.toUpperCase()}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-sm">{conn.users?.full_name}</p>
                          <span className={cn(
                            'text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider',
                            conn.status === 'pending' && 'bg-yellow-500/10 text-yellow-500',
                            conn.status === 'accepted' && 'bg-green-500/10 text-green-500',
                            conn.status === 'declined' && 'bg-red-500/10 text-red-500',
                          )}>
                            {conn.status}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.5 bg-blue-500/10 text-blue-500 rounded font-bold uppercase tracking-wider">
                            {conn.type}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">@{conn.users?.username}</p>
                        {conn.users?.tagline && (
                          <p className="text-xs text-muted-foreground mt-1 italic">
                            {conn.users.tagline}
                          </p>
                        )}
                      </div>

                      <p className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(conn.created_at), { addSuffix: true })}
                      </p>
                    </div>

                    {/* Message */}
                    <div className="mt-3 p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-start gap-2">
                        <ChatCircle className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" weight="duotone" />
                        <p className="text-sm leading-relaxed">{conn.message}</p>
                      </div>
                    </div>

                    {/* Actions */}
                    {conn.status === 'pending' && (
                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          onClick={() => handleAccept(conn.id)}
                          className="flex-1"
                        >
                          <CheckCircle className="w-3.5 h-3.5 mr-1" weight="fill" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDecline(conn.id)}
                          className="flex-1"
                        >
                          <XCircle className="w-3.5 h-3.5 mr-1" weight="fill" />
                          Decline
                        </Button>
                      </div>
                    )}

                    {conn.status === 'accepted' && (
                      <Button size="sm" variant="outline" className="mt-3">
                        <ChatCircle className="w-3.5 h-3.5 mr-1" weight="bold" />
                        Send Message
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}