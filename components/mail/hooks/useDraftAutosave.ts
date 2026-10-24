'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { emitDraftConflict } from '@/lib/mail/mailEvents'
import { mailToast } from '@/lib/mail/toastBus'

type DraftPayload = Record<string, any>

type Options = {
  draftId: string | null
  setDraftId: (id: string | null) => void
  enabled?: boolean
  debounceMs?: number
  buildPayload: () => DraftPayload
  isDirty: boolean
}

const LS_PREFIX = 'dsrt_mail_draft_ver:'

function verKey(id: string) {
  return `${LS_PREFIX}${id}`
}

export function useDraftAutosave({
  draftId,
  setDraftId,
  enabled = true,
  debounceMs = 1400,
  buildPayload,
  isDirty,
}: Options) {
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [conflict, setConflict] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inFlight = useRef(false)
  const localVersion = useRef<string | null>(null)

  const readRemoteVersion = (id: string) => {
    try {
      return localStorage.getItem(verKey(id))
    } catch {
      return null
    }
  }

  const writeRemoteVersion = (id: string, v: string) => {
    try {
      localStorage.setItem(verKey(id), v)
    } catch {
      // ignore quota
    }
  }

  const saveNow = useCallback(async () => {
    if (!enabled || inFlight.current || conflict) return
    const payload = buildPayload()
    if (!payload.from_identity_id) return

    // Multi-tab conflict check
    if (draftId) {
      const remote = readRemoteVersion(draftId)
      if (remote && localVersion.current && remote !== localVersion.current) {
        setConflict(true)
        emitDraftConflict({ draftId, updatedAt: remote })
        mailToast.message('Draft changed in another tab', 'Reload draft before saving again.')
        return
      }
    }

    inFlight.current = true
    setSaving(true)
    try {
      if (draftId) {
        const res = await fetch(`/api/mail/drafts/${draftId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const d = await res.json().catch(() => ({}))
          throw new Error(d.error || 'Draft save failed')
        }
        const v = new Date().toISOString()
        localVersion.current = v
        writeRemoteVersion(draftId, v)
      } else {
        const res = await fetch('/api/mail/drafts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Draft create failed')
        if (data.draft?.id) {
          setDraftId(data.draft.id)
          const v = data.draft.updated_at || new Date().toISOString()
          localVersion.current = v
          writeRemoteVersion(data.draft.id, v)
        }
      }
      setLastSaved(new Date())
      setConflict(false)
    } catch (e: any) {
      console.error(e)
      // soft fail — don't toast every keystroke failure; only if repeated
    } finally {
      setSaving(false)
      inFlight.current = false
    }
  }, [enabled, conflict, buildPayload, draftId, setDraftId])

  // Debounced dirty save
  useEffect(() => {
    if (!enabled || !isDirty || conflict) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      void saveNow()
    }, debounceMs)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [enabled, isDirty, conflict, debounceMs, saveNow, buildPayload])

  // Cross-tab version listener
  useEffect(() => {
    if (!draftId) return
    const onStorage = (e: StorageEvent) => {
      if (e.key !== verKey(draftId) || !e.newValue) return
      if (localVersion.current && e.newValue !== localVersion.current) {
        setConflict(true)
        emitDraftConflict({ draftId, updatedAt: e.newValue })
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [draftId])

  // Seed local version when opening existing draft
  useEffect(() => {
    if (!draftId) {
      localVersion.current = null
      setConflict(false)
      return
    }
    const remote = readRemoteVersion(draftId)
    if (!localVersion.current) {
      const v = remote || new Date().toISOString()
      localVersion.current = v
      writeRemoteVersion(draftId, v)
    }
  }, [draftId])

  const acknowledgeConflictAndTakeOver = useCallback(() => {
    if (!draftId) return
    const v = new Date().toISOString()
    localVersion.current = v
    writeRemoteVersion(draftId, v)
    setConflict(false)
  }, [draftId])

  return {
    saving,
    lastSaved,
    conflict,
    saveNow,
    acknowledgeConflictAndTakeOver,
  }
}