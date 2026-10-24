"use client"

import { useEffect, useRef } from "react"

export type SignalType =
  | "view"
  | "long_view"
  | "click"
  | "visit"
  | "like"
  | "comment"
  | "save"
  | "share"
  | "dismiss"
  | "hide"

export type EntityType = "community" | "project" | "user" | "post" | "venture"

const trackedSessionKeys = new Set<string>()

export async function trackSignal(
  signal_type: SignalType,
  entity_type: EntityType,
  entity_id: string,
  metadata?: Record<string, any>
) {
  const key = `${signal_type}:${entity_type}:${entity_id}`
  if (signal_type === "visit" || signal_type === "view") {
    if (trackedSessionKeys.has(key)) return
    trackedSessionKeys.add(key)
  }

  try {
    await fetch("/api/discover/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signal_type, entity_type, entity_id, metadata }),
    })
  } catch {}
}

/**
 * Auto-tracks dwell time on feed post cards.
 * Fires 'long_view' if visible for >= 4 seconds.
 */
export function usePostDwellTracker(postId: string, tags: string[] = []) {
  const ref = useRef<HTMLDivElement>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || !postId) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry.isIntersecting) {
          timerRef.current = setTimeout(() => {
            trackSignal("long_view", "post", postId, { tags })
          }, 4000)
        } else {
          if (timerRef.current) clearTimeout(timerRef.current)
        }
      },
      { threshold: 0.6 }
    )

    observer.observe(el)
    return () => {
      observer.disconnect()
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [postId, tags])

  return ref
}

/**
 * useViewTracking — fires a callback once when the element becomes visible.
 * Safe no-op if IntersectionObserver isn't available.
 */
export function useViewTracking(
  onView: () => void,
  options: { threshold?: number; enabled?: boolean } = {}
) {
  const ref = useRef<HTMLElement | null>(null)
  const fired = useRef(false)

  useEffect(() => {
    if (options.enabled === false) return
    if (!ref.current || fired.current) return
    if (typeof IntersectionObserver === 'undefined') return

    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !fired.current) {
            fired.current = true
            try { onView() } catch {}
            obs.disconnect()
          }
        }
      },
      { threshold: options.threshold ?? 0.5 }
    )
    obs.observe(ref.current)
    return () => obs.disconnect()
  }, [onView, options.enabled, options.threshold])

  return ref
}

/**
 * useHoverTracking — fires a callback the first time the user hovers the element.
 */
export function useHoverTracking(onHover: () => void, enabled = true) {
  const ref = useRef<HTMLElement | null>(null)
  const fired = useRef(false)

  useEffect(() => {
    if (!enabled) return
    const el = ref.current
    if (!el) return
    const handler = () => {
      if (fired.current) return
      fired.current = true
      try { onHover() } catch {}
      el.removeEventListener('mouseenter', handler)
    }
    el.addEventListener('mouseenter', handler)
    return () => el.removeEventListener('mouseenter', handler)
  }, [onHover, enabled])

  return ref
}