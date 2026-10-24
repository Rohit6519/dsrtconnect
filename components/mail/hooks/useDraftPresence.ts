'use client'

import { useEffect, useMemo, useState } from 'react'

type Presence = {
  tabId: string
  draftId: string
  at: number
}

const CHANNEL = 'dsrt_mail_draft_presence'
const LS_KEY = 'dsrt_mail_draft_presence_map'
const HEARTBEAT_MS = 2000
const STALE_MS = 6000

function readMap(): Record<string, Presence> {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '{}')
  } catch {
    return {}
  }
}

function writeMap(map: Record<string, Presence>) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(map))
  } catch {
    // ignore
  }
}

function newTabId() {
  return `tab_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`
}

export function useDraftPresence(draftId: string | null, active: boolean) {
  const tabId = useMemo(() => newTabId(), [])
  const [foreignEditor, setForeignEditor] = useState(false)

  useEffect(() => {
    if (!draftId || !active || typeof window === 'undefined') {
      setForeignEditor(false)
      return
    }

    let bc: BroadcastChannel | null = null
    try {
      bc = new BroadcastChannel(CHANNEL)
    } catch {
      bc = null
    }

    const beat = () => {
      const map = readMap()
      const now = Date.now()
      for (const k of Object.keys(map)) {
        if (now - (map[k]?.at || 0) > STALE_MS) delete map[k]
      }
      map[`${draftId}:${tabId}`] = { tabId, draftId, at: now }
      writeMap(map)

      const others = Object.values(map).filter(
        (p) => p.draftId === draftId && p.tabId !== tabId && now - p.at <= STALE_MS
      )
      setForeignEditor(others.length > 0)

      bc?.postMessage({ type: 'beat', draftId, tabId, at: now })
    }

    beat()
    const iv = window.setInterval(beat, HEARTBEAT_MS)

    const onMsg = (ev: MessageEvent) => {
      const data = ev.data
      if (!data || data.draftId !== draftId) return
      if (data.tabId === tabId) return
      if (data.type === 'beat') setForeignEditor(true)
      if (data.type === 'leave') beat()
    }
    bc?.addEventListener('message', onMsg)

    const onStorage = (e: StorageEvent) => {
      if (e.key !== LS_KEY) return
      beat()
    }
    window.addEventListener('storage', onStorage)

    return () => {
      window.clearInterval(iv)
      window.removeEventListener('storage', onStorage)
      bc?.removeEventListener('message', onMsg)
      try {
        const map = readMap()
        delete map[`${draftId}:${tabId}`]
        writeMap(map)
        bc?.postMessage({ type: 'leave', draftId, tabId, at: Date.now() })
      } catch {
        // ignore
      }
      bc?.close()
    }
  }, [draftId, active, tabId])

  return { foreignEditor, tabId }
}