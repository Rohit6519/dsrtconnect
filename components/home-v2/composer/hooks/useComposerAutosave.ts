'use client'

import { useEffect, useRef, useState } from 'react'
import { useComposer } from '../ComposerContext'

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export function useComposerAutosave(enabled: boolean = true) {
  const composer = useComposer()
  const [status, setStatus] = useState<AutosaveStatus>('idle')
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const lastSerializedRef = useRef<string>('')
  const savingRef = useRef(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!enabled) return
    if (!composer.publisher) return

    // Only autosave if there's meaningful content
    const hasContent =
      composer.content.trim().length > 0 ||
      composer.title.trim().length > 0 ||
      composer.media.length > 0

    if (!hasContent) return

    const payload = { ...composer.serialize(), id: composer.draftId }
    const serialized = JSON.stringify(payload)
    if (serialized === lastSerializedRef.current) return

    if (timerRef.current) clearTimeout(timerRef.current)

    timerRef.current = setTimeout(async () => {
      if (savingRef.current) return
      savingRef.current = true
      setStatus('saving')

      try {
        const res = await fetch('/api/home/posts/drafts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error('Save failed')
        const data = await res.json()
        if (data.draft?.id && !composer.draftId) {
          composer.setDraftId(data.draft.id)
        }
        lastSerializedRef.current = serialized
        setStatus('saved')
        setLastSavedAt(new Date())

        setTimeout(() => {
          setStatus(cur => cur === 'saved' ? 'idle' : cur)
        }, 2500)
      } catch (e) {
        console.error('Autosave error:', e)
        setStatus('error')
      } finally {
        savingRef.current = false
      }
    }, 2000)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    composer.publisher, composer.postType, composer.title, composer.content,
    composer.contentBlocks, composer.media, composer.tags, composer.visibility,
    composer.commentsPermission, enabled,
  ])

  return { status, lastSavedAt }
}