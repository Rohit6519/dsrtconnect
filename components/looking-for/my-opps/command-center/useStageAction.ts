'use client'

import { useCallback, useState } from 'react'
import type { PipelineStage } from '@/lib/applications/types'

export interface StageActionRequest {
  applicationIds: string[]
  opportunityId: string
  target: PipelineStage

  // Data captured in the drawer
  notifyCandidate: boolean
  editedSubject?: string
  editedBody?: string
  nextStep?: string          // key from spec.nextSteps
  internalReason?: string    // rejection reason etc.
  reasonNote?: string        // free text (internal-only)
  reviewerId?: string | null // for reviewer_assigned optional flow
}

interface Options {
  onDone?: () => void
}

/**
 * Wraps calls to the bulk endpoint so the drawer can dispatch one
 * or many applications identically. Everything flows through
 * /api/opportunities/applications/bulk which internally calls
 * WorkflowService.transition (Phase 1).
 */
export function useStageAction(opts: Options = {}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = useCallback(async (req: StageActionRequest) => {
    if (req.applicationIds.length === 0) return { ok: false, error: 'No applications' }
    setBusy(true)
    setError(null)

    try {
      // 1. Fire the workflow transition through bulk endpoint
      const res = await fetch('/api/opportunities/applications/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          application_ids: req.applicationIds,
          action: 'set_stage',
          stage: req.target,
          notify_candidate: req.notifyCandidate,
          reason: req.internalReason || req.reasonNote || null,
          metadata: {
            edited_subject: req.editedSubject,
            edited_body: req.editedBody,
            next_step: req.nextStep,
            reason_note: req.reasonNote,
          },
        }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d?.error || 'Action failed')

      // 2. Optional reviewer assignment fan-out
      if (req.nextStep === 'assign_reviewer' && req.reviewerId) {
        await fetch('/api/opportunities/applications/bulk', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            application_ids: req.applicationIds,
            action: 'assign_reviewer',
            reviewer_id: req.reviewerId,
          }),
        }).catch(() => {})
      }

      opts.onDone?.()
      return { ok: true, updated: d?.updated ?? 0 }
    } catch (e: any) {
      setError(e?.message || 'Action failed')
      return { ok: false, error: e?.message }
    } finally {
      setBusy(false)
    }
  }, [opts])

  return { run, busy, error, clearError: () => setError(null) }
}