'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { DraftData, CommunityDraft } from '@/lib/community/service.drafts'

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export function useCommunityDraft(draftId: string | null) {
  const [draft, setDraft] = useState<CommunityDraft | null>(null)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<AutosaveStatus>('idle')
  const [statusText, setStatusText] = useState<string | undefined>()
  const debouncerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inflightRef = useRef(false)

  const load = useCallback(async () => {
    if (!draftId) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/community/drafts/${draftId}`, { cache: 'no-store' })
      const json = await res.json()
      if (res.ok) setDraft(json?.data?.draft || null)
    } finally {
      setLoading(false)
    }
  }, [draftId])

  useEffect(() => {
    load()
  }, [load])

  const persist = useCallback(
    async (patch: Partial<DraftData>, step?: string) => {
      if (!draftId) return
      if (inflightRef.current) return
      inflightRef.current = true
      setStatus('saving')
      try {
        const res = await fetch(`/api/v1/community/drafts/${draftId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: patch, step }),
        })
        const json = await res.json()
        if (res.ok) {
          setDraft(json?.data?.draft || null)
          setStatus('saved')
          setStatusText('Draft saved')
        } else {
          setStatus('error')
          setStatusText(json?.error?.message || 'Save failed')
        }
      } catch {
        setStatus('error')
        setStatusText('Save failed')
      } finally {
        inflightRef.current = false
      }
    },
    [draftId]
  )

  /**
   * Merge into local draft immediately for UI responsiveness,
   * then debounce-persist to server.
   */
  const patch = useCallback(
    (patch: Partial<DraftData>, opts?: { step?: string; debounceMs?: number }) => {
      setDraft((prev) => {
        if (!prev) return prev
        return { ...prev, data: { ...(prev.data || {}), ...patch } }
      })
      if (debouncerRef.current) clearTimeout(debouncerRef.current)
      const delay = opts?.debounceMs ?? 900
      debouncerRef.current = setTimeout(() => {
        persist(patch, opts?.step)
      }, delay)
    },
    [persist]
  )

  /**
   * Force immediate flush (e.g., on step-nav).
   */
  const flush = useCallback(
    async (patchData?: Partial<DraftData>, step?: string) => {
      if (debouncerRef.current) {
        clearTimeout(debouncerRef.current)
        debouncerRef.current = null
      }
      await persist(patchData ?? {}, step)
    },
    [persist]
  )

  return {
    draft,
    loading,
    status,
    statusText,
    patch,
    flush,
    reload: load,
  }
}