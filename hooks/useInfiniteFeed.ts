'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { ExploreFeedModule } from '@/lib/venture-explore/types'

interface UseInfiniteFeedOptions {
  fetcher: (cursor?: string) => Promise<{ modules: ExploreFeedModule[], nextCursor?: string | null }>
  deps: any[]
  enabled?: boolean
}

export function useInfiniteFeed({ fetcher, deps, enabled = true }: UseInfiniteFeedOptions) {
  const [modules, setModules] = useState<ExploreFeedModule[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const lastFetchRef = useRef<string>('')
  const emptyPageCountRef = useRef(0)

  useEffect(() => {
    if (!enabled) return
    
    const fetchKey = JSON.stringify(deps)
    if (fetchKey === lastFetchRef.current) return
    lastFetchRef.current = fetchKey
    emptyPageCountRef.current = 0

    let cancelled = false
    setLoading(true)
    setError(null)
    setModules([])
    setCursor(null)
    setHasMore(true)

    fetcher()
      .then(({ modules: mods, nextCursor }) => {
        if (cancelled) return
        setModules(mods || [])
        setCursor(nextCursor || null)
        setHasMore(!!nextCursor && (mods?.some(m => m.items.length > 0) ?? false))
      })
      .catch((e) => {
        if (cancelled) return
        setError(e?.message || 'Failed to load feed')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps.concat([enabled]))

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      const { modules: newMods, nextCursor } = await fetcher(cursor)
      
      if (newMods && newMods.length > 0 && newMods.some(m => m.items.length > 0)) {
        emptyPageCountRef.current = 0
        setModules(prev => {
          const merged = [...prev]
          for (const m of newMods) {
            merged.push(m)
          }
          return merged
        })
      } else {
        // Empty response — increment counter, stop only after 3 consecutive empty pages
        emptyPageCountRef.current += 1
      }

      setCursor(nextCursor || null)
      
      // Only actually stop after 3 empty pages OR no cursor returned
      if (!nextCursor || emptyPageCountRef.current >= 3) {
        setHasMore(false)
      }
    } catch (e: any) {
      console.error('Load more failed:', e)
    } finally {
      setLoadingMore(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor, loadingMore, hasMore, fetcher])

  useEffect(() => {
    if (!sentinelRef.current || !hasMore || loading) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore()
      },
      { rootMargin: '600px' }
    )
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [loadMore, hasMore, loading])

  const removeItem = useCallback((ventureId: string) => {
    setModules(prev => prev.map(m => ({
      ...m,
      items: m.items.filter(i => i.id !== ventureId)
    })))
  }, [])

  return { modules, loading, loadingMore, hasMore, error, sentinelRef, loadMore, removeItem }
}