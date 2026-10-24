'use client'

import { useState, useEffect } from 'react'
import { Heart } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { motion } from 'framer-motion'

interface Props {
  communityId: string
  initialCount?: number
  initialLiked?: boolean
  size?: 'sm' | 'md' | 'lg'
  showCount?: boolean
}

export function LikeButton({ 
  communityId, 
  initialCount = 0,
  initialLiked = false,
  size = 'md',
  showCount = true 
}: Props) {
  const [liked, setLiked] = useState(initialLiked)
  const [count, setCount] = useState(initialCount)
  const [loading, setLoading] = useState(false)
  const [animate, setAnimate] = useState(false)

  // Check if user already liked (only if initialLiked not provided)
  useEffect(() => {
    if (!initialLiked) {
      fetch(`/api/communities/${communityId}/like`)
        .then(async r => {
          if (!r.ok) return { liked: false }
          try {
            return await r.json()
          } catch {
            return { liked: false }
          }
        })
        .then(data => setLiked(data.liked))
        .catch(() => {})
    }
  }, [communityId, initialLiked])

  const handleToggleLike = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (loading) return
    setLoading(true)
    
    // Optimistic update
    const newLiked = !liked
    setLiked(newLiked)
    setCount(prev => newLiked ? prev + 1 : Math.max(0, prev - 1))
    setAnimate(true)
    setTimeout(() => setAnimate(false), 300)

    try {
      const res = await fetch(`/api/communities/${communityId}/like`, {
        method: newLiked ? 'POST' : 'DELETE',
      })

      if (!res.ok) {
        throw new Error('Request failed')
      }

      const data = await res.json()

      if (data.like_count !== undefined) {
        setCount(data.like_count)
      }
    } catch (e: any) {
      // Revert on error
      setLiked(!newLiked)
      setCount(prev => newLiked ? prev - 1 : prev + 1)
      toast.error('Failed to update like')
    } finally {
      setLoading(false)
    }
  }

  const sizeMap = {
    sm: { icon: 'w-3.5 h-3.5', text: 'text-[10px]', padding: 'px-2 py-1' },
    md: { icon: 'w-4 h-4', text: 'text-xs', padding: 'px-2.5 py-1.5' },
    lg: { icon: 'w-5 h-5', text: 'text-sm', padding: 'px-3 py-2' },
  }
  const sizes = sizeMap[size]

  return (
    <motion.button
      onClick={handleToggleLike}
      disabled={loading}
      whileTap={{ scale: 0.9 }}
      className={cn(
        'flex items-center gap-1 rounded-lg font-semibold transition-all',
        sizes.padding,
        liked 
          ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
          : 'bg-muted/40 text-muted-foreground hover:bg-muted hover:text-red-500'
      )}
    >
      <motion.div
        animate={animate ? { scale: [1, 1.4, 1] } : {}}
        transition={{ duration: 0.3 }}
      >
        <Heart 
          className={cn(sizes.icon, 'transition-colors')}
          weight={liked ? 'fill' : 'regular'} 
        />
      </motion.div>
      {showCount && (
        <span className={cn(sizes.text, 'tabular-nums')}>
          {count.toLocaleString()}
        </span>
      )}
    </motion.button>
  )
}