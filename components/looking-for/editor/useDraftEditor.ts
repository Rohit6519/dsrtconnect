'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export interface CustomQuestion {
  id: string
  question: string
  type: 'short_answer' | 'long_answer' | 'yes_no' | 'multiple_choice' | 'number' | 'url'
  required: boolean
  options?: string[]
  placeholder?: string
}

export interface ApplicationConfig {
  visibility: 'everyone' | 'members_only' | 'verified_only' | 'invite_only'
  applications_open: boolean
  application_deadline: string | null
  require_resume: boolean
  require_portfolio: boolean
  require_github: boolean
  require_website: boolean
  require_cover_letter: boolean
  require_dsrt_profile: boolean
  require_short_intro: boolean
  require_relevant_experience: boolean
}

export const DEFAULT_APPLICATION_CONFIG: ApplicationConfig = {
  visibility: 'everyone',
  applications_open: true,
  application_deadline: null,
  require_resume: false,
  require_portfolio: false,
  require_github: false,
  require_website: false,
  require_cover_letter: false,
  require_dsrt_profile: true,
  require_short_intro: true,
  require_relevant_experience: false,
}

export interface DraftState {
  id: string | null
  title: string
  subline: string
  cover_image_url: string | null
  content_blocks: any[]
  content_html: string
  content_text: string
  request_type: string | null
  role_category: string | null
  employment_type: string | null
  work_mode: string | null
  location: string | null
  experience_level: string | null
  required_skills: string[]
  nice_to_have_skills: string[]
  context_type: 'personal' | 'project' | 'venture' | 'organization'
  project_id: string | null
  venture_id: string | null
  organization_id: string | null
  custom_questions: CustomQuestion[]
  application_config: ApplicationConfig
}

export const DEFAULT_DRAFT: DraftState = {
  id: null,
  title: '',
  subline: '',
  cover_image_url: null,
  content_blocks: [],
  content_html: '',
  content_text: '',
  request_type: null,
  role_category: null,
  employment_type: null,
  work_mode: 'remote',
  location: null,
  experience_level: null,
  required_skills: [],
  nice_to_have_skills: [],
  context_type: 'personal',
  project_id: null,
  venture_id: null,
  organization_id: null,
  custom_questions: [],
  application_config: DEFAULT_APPLICATION_CONFIG,
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export function useDraftEditor() {
  const [draft, setDraft] = useState<DraftState>(DEFAULT_DRAFT)
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const draftRef = useRef(draft)
  useEffect(() => { draftRef.current = draft }, [draft])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch('/api/looking-for/drafts')
        const data = await res.json()
        if (cancelled) return

        if (data.draft) {
          setDraft({
            id: data.draft.id,
            title: data.draft.title || '',
            subline: data.draft.subline || '',
            cover_image_url: data.draft.cover_image_url || null,
            content_blocks: data.draft.content_blocks || [],
            content_html: data.draft.content_html || '',
            content_text: data.draft.content_text || '',
            request_type: data.draft.request_type || null,
            role_category: data.draft.role_category || null,
            employment_type: data.draft.employment_type || null,
            work_mode: data.draft.work_mode || 'remote',
            location: data.draft.location || null,
            experience_level: data.draft.experience_level || null,
            required_skills: data.draft.required_skills || [],
            nice_to_have_skills: data.draft.nice_to_have_skills || [],
            context_type: data.draft.context_type || 'personal',
            project_id: data.draft.project_id || null,
            venture_id: data.draft.venture_id || null,
            organization_id: data.draft.organization_id || null,
            custom_questions: data.draft.custom_questions || [],
            application_config: {
              ...DEFAULT_APPLICATION_CONFIG,
              ...(data.draft.application_config || {}),
            },
          })
          setLastSavedAt(new Date(data.draft.updated_at))
        }
      } catch { /* ignore */ }
      finally { if (!cancelled) setLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const persist = useCallback(async (source: 'auto' | 'manual' | 'preview' = 'auto') => {
    const cur = draftRef.current
    setSaveStatus('saving')
    setError(null)
    try {
      if (!cur.id) {
        const res = await fetch('/api/looking-for/drafts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...cur, save_source: source }),
        })
        if (!res.ok) throw new Error('Save failed')
        const data = await res.json()
        setDraft(d => ({ ...d, id: data.draft.id }))
        setLastSavedAt(new Date(data.draft.updated_at))
      } else {
        const res = await fetch(`/api/looking-for/drafts?id=${cur.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: cur.title,
            subline: cur.subline,
            cover_image_url: cur.cover_image_url,
            content_blocks: cur.content_blocks,
            content_html: cur.content_html,
            content_text: cur.content_text,
            request_type: cur.request_type,
            role_category: cur.role_category,
            employment_type: cur.employment_type,
            work_mode: cur.work_mode,
            location: cur.location,
            experience_level: cur.experience_level,
            required_skills: cur.required_skills,
            nice_to_have_skills: cur.nice_to_have_skills,
            context_type: cur.context_type,
            project_id: cur.project_id,
            venture_id: cur.venture_id,
            organization_id: cur.organization_id,
            custom_questions: cur.custom_questions,
            application_config: cur.application_config,
            save_source: source,
          }),
        })
        if (!res.ok) throw new Error('Save failed')
        const data = await res.json()
        setLastSavedAt(new Date(data.draft.updated_at))
      }
      setSaveStatus('saved')
    } catch (e: any) {
      setSaveStatus('error')
      setError(e.message)
    }
  }, [])

  const update = useCallback((patch: Partial<DraftState>) => {
    setDraft(d => ({ ...d, ...patch }))
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => persist('auto'), 1200)
  }, [persist])

  useEffect(() => () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
  }, [])

  const forceSave = useCallback(() => persist('manual'), [persist])

  return {
    draft,
    loading,
    update,
    forceSave,
    saveStatus,
    lastSavedAt,
    error,
  }
}
