'use client'

import { useCallback, useRef } from 'react'

/**
 * Returns a callback whose identity NEVER changes, but which always invokes
 * the latest passed-in function. Fixes the entire class of `useEffect` /
 * `useCallback` stale-closure bugs that plague cursor pagination + infinite
 * scroll code.
 *
 * Example:
 *
 *   const load = useStableCallback(async (reset: boolean) => {
 *     const cursor = reset ? null : localCursor  // always fresh
 *     // ...
 *   })
 *
 *   useEffect(() => {
 *     load(true)  // safe — load reference never changes
 *   }, [slug])
 *
 *   useEffect(() => {
 *     if (!hasMore) return
 *     const io = new IntersectionObserver(([e]) => e.isIntersecting && load(false))
 *     // ...
 *   }, [hasMore])  // no longer needs to reconnect on cursor change
 */
export function useStableCallback<TArgs extends any[], TReturn>(
  fn: (...args: TArgs) => TReturn
): (...args: TArgs) => TReturn {
  const ref = useRef(fn)
  ref.current = fn
  return useCallback((...args: TArgs) => ref.current(...args), [])
}