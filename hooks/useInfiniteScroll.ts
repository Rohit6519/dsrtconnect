'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface UseInfiniteScrollOptions {
  fetchFn: (offset: number) => Promise<{ items: any[]; hasMore: boolean; total: number }>
  initialItems?: any[]
  pageSize?: number
  enabled?: boolean
}

export function useInfiniteScroll({
  fetchFn,
  initialItems = [],
  pageSize = 24,
  enabled = true,
}: UseInfiniteScrollOptions) {
  const [items, setItems] = useState<any[]>(initialItems)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)
  const [total, setTotal] = useState(0)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const loadInitial = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    setOffset(0)
    try {
      const result = await fetchFn(0)
      setItems(result.items)
      setHasMore(result.hasMore)
      setTotal(result.total)
      setOffset(result.items.length)
    } catch (e) {
      console.error('Initial load error:', e)
    } finally {
      setLoading(false)
    }
  }, [fetchFn, enabled])

  const loadMore = useCallback(async () => {
    if (!enabled || !hasMore || loadingMore || loading) return
    setLoadingMore(true)
    try {
      const result = await fetchFn(offset)
      setItems(prev => [...prev, ...result.items])
      setHasMore(result.hasMore)
      setTotal(result.total)
      setOffset(prev => prev + result.items.length)
    } catch (e) {
      console.error('Load more error:', e)
    } finally {
      setLoadingMore(false)
    }
  }, [fetchFn, offset, hasMore, loadingMore, loading, enabled])

  // Intersection observer for infinite scroll
  useEffect(() => {
    if (!enabled) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          loadMore()
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    )
    const target = sentinelRef.current
    if (target) observer.observe(target)
    return () => { if (target) observer.unobserve(target) }
  }, [enabled, hasMore, loadingMore, loading, loadMore])

  const reset = useCallback(() => {
    setItems([])
    setOffset(0)
    setHasMore(true)
    setTotal(0)
  }, [])

  return {
    items,
    loading,
    loadingMore,
    hasMore,
    total,
    sentinelRef,
    loadInitial,
    loadMore,
    reset,
    setItems,
  }
}
