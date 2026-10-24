'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useStableCallback } from './useStableCallback'

/**
 * Debounces a callback: rapid calls collapse into a single invocation
 * after `delayMs` of quiet time. Latest arguments win.
 *
 * The returned function has a STABLE identity — safe to include in
 * useEffect dependency arrays without triggering resubscribes.
 *
 * On unmount any pending timer is cleared, so no invocation fires
 * after the component has left the tree.
 *
 * Example:
 *   const debouncedReload = useDebouncedCallback(() => reload(), 500)
 *   channel.on('postgres_changes', {...}, () => debouncedReload())
 */
export function useDebouncedCallback<TArgs extends any[]>(
  fn: (...args: TArgs) => void,
  delayMs: number
): (...args: TArgs) => void {
  const stable = useStableCallback(fn)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [])

  return useCallback(
    (...args: TArgs) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        timerRef.current = null
        stable(...args)
      }, delayMs)
    },
    [stable, delayMs]
  )
}