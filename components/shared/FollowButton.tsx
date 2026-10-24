'use client'

import { useState } from 'react'

interface Props {
  entityType: 'user' | 'project' | 'venture'
  entityId: string
  entitySlug?: string
  initialFollowing: boolean
  onToggle?: (following: boolean) => void
  size?: 'sm' | 'md'
}

export function FollowButton({ entityType, entityId, entitySlug, initialFollowing, onToggle, size = 'md' }: Props) {
  const [following, setFollowing] = useState(initialFollowing)
  const [loading, setLoading] = useState(false)

  const toggle = async () => {
    if (loading) return
    setLoading(true)
    const newState = !following
    setFollowing(newState)

    try {
      let url = ''
      if (entityType === 'venture' && entitySlug) {
        url = '/api/ventures/' + entitySlug + '/followers'
      } else if (entityType === 'project' && entitySlug) {
        url = '/api/projects/' + entitySlug + '/follow'
      } else {
        url = '/api/follow'
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          following_type: entityType,
          following_id: entityId,
        }),
      })

      if (!res.ok) throw new Error()

      const data = await res.json()
      const actualState = data.following !== undefined ? data.following : newState
      setFollowing(actualState)
      onToggle?.(actualState)
    } catch {
      setFollowing(!newState)
    } finally {
      setLoading(false)
    }
  }

  const isSmall = size === 'sm'

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={
        'font-semibold rounded-md transition-colors disabled:opacity-60 ' +
        (isSmall ? 'text-[12px] h-8 px-3 ' : 'text-[13px] h-9 px-4 ') +
        (following
          ? 'bg-white/[0.08] border border-white/[0.15] text-white hover:bg-white/[0.12]'
          : 'bg-white text-black hover:bg-white/90')
      }
    >
      {following ? 'Following' : 'Follow'}
    </button>
  )
}
