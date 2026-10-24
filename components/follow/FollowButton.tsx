'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { UserPlus, UserCheck, UserMinus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface FollowButtonProps {
  targetId: string
  targetType?: 'user' | 'project' | 'community'
  initialFollowing?: boolean
  size?: 'sm' | 'default' | 'lg'
  variant?: 'default' | 'outline' | 'ghost'
  showText?: boolean
  onFollowChange?: (following: boolean) => void
}

export function FollowButton({
  targetId,
  targetType = 'user',
  initialFollowing = false,
  size = 'default',
  variant = 'default',
  showText = true,
  onFollowChange,
}: FollowButtonProps) {
  const [following, setFollowing] = useState(initialFollowing)
  const [loading, setLoading] = useState(false)
  const [hovering, setHovering] = useState(false)

  const handleClick = async () => {
    setLoading(true)
    const wasFollowing = following

    // Optimistic update
    setFollowing(!following)
    onFollowChange?.(!following)

    try {
      const res = await fetch('/api/follow', {
        method: wasFollowing ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: wasFollowing 
          ? undefined 
          : JSON.stringify({ targetId, targetType }),
        ...(wasFollowing && {
          method: 'DELETE',
        })
      })

      if (wasFollowing) {
        // Use query params for DELETE
        const deleteRes = await fetch(
          `/api/follow?targetId=${targetId}&targetType=${targetType}`,
          { method: 'DELETE' }
        )
        if (!deleteRes.ok) throw new Error('Failed to unfollow')
      } else {
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Failed to follow')
        }
      }
    } catch (err: any) {
      setFollowing(wasFollowing) // Rollback
      onFollowChange?.(wasFollowing)
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const label = following 
    ? (hovering ? 'Unfollow' : 'Following')
    : 'Follow'
  
  const Icon = loading ? Loader2 
    : following 
      ? (hovering ? UserMinus : UserCheck)
      : UserPlus

  return (
    <Button
      onClick={handleClick}
      disabled={loading}
      size={size}
      variant={following ? 'outline' : variant}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className={cn(
        following && hovering && 'border-destructive text-destructive hover:bg-destructive/10',
      )}
    >
      <Icon className={cn('w-4 h-4', loading && 'animate-spin', showText && 'mr-1.5')} />
      {showText && label}
    </Button>
  )
}