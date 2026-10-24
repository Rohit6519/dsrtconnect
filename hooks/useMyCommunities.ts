'use client'

import { useCallback, useEffect, useState } from 'react'

export interface MyCommunityItem {
  membership_id: string
  joined_at: string
  role_keys: string[]
  top_role: 'OWNER' | 'ADMIN' | 'MODERATOR' | 'MEMBER'
  community: {
    id: string
    public_id: string
    slug: string
    name: string
    short_description: string | null
    cover_url: string | null
    banner_url: string | null
    category: string | null
    community_type: string | null
    visibility: string
    join_policy: string
    status: string
    is_verified: boolean
    member_count: number
    post_count: number
    topics: string[]
    location_text: string | null
    updated_at: string
  }
}

export interface DraftItem {
  id: string
  step: string
  data: Record<string, any>
  status: string
  updated_at: string
  created_at: string
}

export function useMyCommunities() {
  const [items, setItems] = useState<MyCommunityItem[]>([])
  const [drafts, setDrafts] = useState<DraftItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/v1/community/mine', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) {
        setError(json?.error?.code || 'FETCH_FAILED')
        setItems([])
        setDrafts([])
        return
      }
      setItems(json?.data?.items || [])
      setDrafts(json?.data?.drafts || [])
    } catch {
      setError('NETWORK_ERROR')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { items, drafts, loading, error, reload: load }
}