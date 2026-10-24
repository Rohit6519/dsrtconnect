'use client'

import { useState, useEffect, useRef } from 'react'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export function useAutosave(draft: any, delayMs: number = 1500) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const lastSerializedRef = useRef<string>('')
  const savingRef = useRef(false)

  useEffect(() => {
    if (!draft?.id) return

    // Serialize what we care about
    const serialized = JSON.stringify({
      title: draft.title,
      subtitle: draft.subtitle,
      description: draft.description,
      content_blocks: draft.content_blocks,
      content_text: draft.content_text,
      poster_context: draft.poster_context,
      project_id: draft.project_id,
      venture_id: draft.venture_id,
      opportunity_type: draft.opportunity_type,
      primary_category_id: draft.primary_category_id,
      subcategory_id: draft.subcategory_id,
      required_skills: draft.required_skills,
      preferred_skills: draft.preferred_skills,
      experience_level: draft.experience_level,
      compensation_type: draft.compensation_type,
      compensation_min: draft.compensation_min,
      compensation_max: draft.compensation_max,
      compensation_currency: draft.compensation_currency,
      equity_min: draft.equity_min,
      equity_max: draft.equity_max,
      project_length: draft.project_length,
      time_commitment: draft.time_commitment,
      hours_per_week: draft.hours_per_week,
      start_date: draft.start_date,
      application_deadline: draft.application_deadline,
      work_mode: draft.work_mode,
      location: draft.location,
      team_context: draft.team_context,
      positions_open: draft.positions_open,
      custom_questions: draft.custom_questions,
      require_resume: draft.require_resume,
      require_portfolio: draft.require_portfolio,
      require_github: draft.require_github,
      require_website: draft.require_website,
      require_cover_letter: draft.require_cover_letter,
      visibility: draft.visibility,
      show_compensation: draft.show_compensation,
      show_location: draft.show_location,
      show_applicant_count: draft.show_applicant_count,
      show_poster_identity: draft.show_poster_identity,
      urgency: draft.urgency,
      applications_open: draft.applications_open,
      allow_withdrawal: draft.allow_withdrawal,
      auto_close_after_deadline: draft.auto_close_after_deadline,
      max_applications: draft.max_applications,
      cover_image_url: draft.cover_image_url,
    })

    // No change → no save
    if (serialized === lastSerializedRef.current) return

    if (timerRef.current) clearTimeout(timerRef.current)

    timerRef.current = setTimeout(async () => {
      if (savingRef.current) return
      savingRef.current = true
      setSaveStatus('saving')

      try {
        const payload = JSON.parse(serialized)
        payload.id = draft.id

        const res = await fetch('/api/opportunities/drafts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        if (!res.ok) throw new Error('Save failed')

        lastSerializedRef.current = serialized
        setSaveStatus('saved')
        setLastSavedAt(new Date())

        // Clear "saved" indicator after a moment
        setTimeout(() => {
          setSaveStatus(cur => cur === 'saved' ? 'idle' : cur)
        }, 3000)
      } catch (e) {
        console.error('Autosave error:', e)
        setSaveStatus('error')
      } finally {
        savingRef.current = false
      }
    }, delayMs)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [draft, delayMs])

  return { saveStatus, lastSavedAt }
}