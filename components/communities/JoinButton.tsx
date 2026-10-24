'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Users, Check, Loader2, LogOut } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface JoinButtonProps {
  communityId: string
  initialJoined?: boolean
  size?: 'sm' | 'default' | 'lg'
  variant?: 'default' | 'outline'
  showText?: boolean
  onChange?: (joined: boolean) => void
}

export function JoinButton({
  communityId,
  initialJoined = false,
  size = 'default',
  variant = 'default',
  showText = true,
  onChange,
}: JoinButtonProps) {
  const [joined, setJoined] = useState(initialJoined)
  const [loading, setLoading] = useState(false)
  const [hovering, setHovering] = useState(false)

  const handleClick = async () => {
    setLoading(true)
    const wasJoined = joined
    setJoined(!wasJoined)
    onChange?.(!wasJoined)

    try {
      if (wasJoined) {
        const res = await fetch(`/api/communities/join?communityId=${communityId}`, {
          method: 'DELETE',
        })
        if (!res.ok) throw new Error('Failed to leave')
        toast.success('Left community')
      } else {
        const res = await fetch('/api/communities/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ communityId }),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Failed to join')
        }
        toast.success('Joined community')
      }
    } catch (err: any) {
      setJoined(wasJoined)
      onChange?.(wasJoined)
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const label = joined 
    ? (hovering ? 'Leave' : 'Joined')
    : 'Join'
  
  const Icon = loading ? Loader2 
    : joined 
      ? (hovering ? LogOut : Check)
      : Users

  return (
    <Button
      onClick={handleClick}
      disabled={loading}
      size={size}
      variant={joined ? 'outline' : variant}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className={cn(
        joined && hovering && 'border-destructive text-destructive hover:bg-destructive/10',
      )}
    >
      <Icon className={cn('w-4 h-4', loading && 'animate-spin', showText && 'mr-1.5')} />
      {showText && label}
    </Button>
  )
}