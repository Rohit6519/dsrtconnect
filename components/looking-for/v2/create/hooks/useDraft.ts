'use client'

import { useState, useEffect, useCallback } from 'react'

export function useDraft(editId?: string | null) {
  const [draft, setDraft] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        // If edit id provided, load that specific draft/opportunity
        if (editId) {
          const res = await fetch('/api/opportunities/drafts?id=' + editId)
          const data = await res.json()
          if (data.draft) {
            setDraft(data.draft)
            setLoading(false)
            return
          }
        }

        // Otherwise, try to load most recent draft
        const res = await fetch('/api/opportunities/drafts')
        const data = await res.json()

        if (data.draft) {
          setDraft(data.draft)
        } else {
          // Create new draft
          const createRes = await fetch('/api/opportunities/drafts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: '',
              opportunity_type: 'hire',
              status: 'draft',
            }),
          })
          const createData = await createRes.json()
          if (createData.draft) setDraft(createData.draft)
        }
      } catch (e) {
        console.error('Load draft error:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [editId])

  const updateDraft = useCallback((patch: any) => {
    setDraft((prev: any) => prev ? { ...prev, ...patch } : prev)
  }, [])

  const resetDraft = useCallback(() => {
    setDraft(null)
  }, [])

  return { draft, loading, updateDraft, resetDraft }
}