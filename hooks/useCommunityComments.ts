'use client'

import { useCallback, useEffect, useState } from 'react'

export function useCommunityComments(targetType: 'post' | 'announcement' | 'comment', targetId: string | null) {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!targetId) { setItems([]); setLoading(false); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/community/comments/list?target_type=${targetType}&target_id=${targetId}`, { cache: 'no-store' })
      const json = await res.json()
      if (res.ok) setItems(json?.data?.items || [])
    } finally {
      setLoading(false)
    }
  }, [targetType, targetId])

  useEffect(() => { load() }, [load])
  return { items, loading, reload: load }
}