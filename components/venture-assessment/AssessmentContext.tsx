'use client'

import {
  createContext, useContext, useState, useEffect, useCallback,
  useRef, ReactNode
} from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export interface VentureAssessmentData {
  venture: any
  assessment: any
  steps: {
    step1_venture: any
    step2_problem: any
    step3_insight: any
    step4_customer: { profile: any; alternatives: any[] }
    step5_solution: any
    step6_market: any
    step7_competition: { competitors: any[]; differentiation: any }
    step8_founder_team: { founder_answers: any; capabilities: any }
    step9_reality_check: { assumptions: any[]; risks: any }
    step10_next_move: { next_move: any; milestones: any[] }
  }
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface AssessmentContextValue {
  slug: string
  currentStep: number
  data: VentureAssessmentData | null
  loading: boolean
  error: string | null

  saveStatus: SaveStatus
  lastSavedAt: Date | null
  isDirty: boolean

  // Autosave a partial field update for a step (debounced)
  updateStepField: (step: number, patch: Record<string, any>) => void

  // Immediately flush pending saves (used before nav)
  flushPending: () => Promise<void>

  // Force reload from server
  reload: () => Promise<void>

  // Mark step completed and advance
  goToStep: (step: number, markCurrentComplete?: boolean) => Promise<void>

  // Publish
  publishAssessment: () => Promise<{ success: boolean; error?: string; missing?: any[] }>

  // Helpers
  isStepCompleted: (step: number) => boolean
  canAccessStep: (step: number) => boolean
}

const AssessmentContext = createContext<AssessmentContextValue | null>(null)

// ═══════════════════════════════════════════════════════════════════
// PROVIDER
// ═══════════════════════════════════════════════════════════════════

interface Props {
  slug: string
  initialStep: number
  children: ReactNode
}

const AUTOSAVE_DEBOUNCE_MS = 900

export function AssessmentProvider({ slug, initialStep, children }: Props) {
  const router = useRouter()

  const [data, setData] = useState<VentureAssessmentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState(initialStep)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [isDirty, setIsDirty] = useState(false)

  // Pending patches per step, waiting to be flushed
  const pendingPatchesRef = useRef<Map<number, Record<string, any>>>(new Map())
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const inFlightRef = useRef<Promise<void> | null>(null)

  // ─── LOAD ───
  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/ventures/${slug}/assessment`)
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Failed to load assessment')
      }
      const json = await res.json()
      setData(json)
    } catch (e: any) {
      setError(e.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => { load() }, [load])

  useEffect(() => { setCurrentStep(initialStep) }, [initialStep])

  // ─── OPTIMISTIC UPDATE + AUTOSAVE ───

  const applyLocalPatch = useCallback((step: number, patch: Record<string, any>) => {
    setData(prev => {
      if (!prev) return prev
      const next = { ...prev, steps: { ...prev.steps } }

      switch (step) {
        case 1:
          next.steps.step1_venture = { ...next.steps.step1_venture, ...patch }
          // Also update venture root reference
          next.venture = { ...next.venture, ...patch }
          break
        case 2:
          next.steps.step2_problem = { ...(next.steps.step2_problem || {}), ...patch }
          break
        case 3:
          next.steps.step3_insight = { ...(next.steps.step3_insight || {}), ...patch }
          break
        case 4:
          // Only profile fields (alternatives handled separately via their own endpoint)
          next.steps.step4_customer = {
            ...next.steps.step4_customer,
            profile: { ...(next.steps.step4_customer.profile || {}), ...patch }
          }
          break
        case 5:
          next.steps.step5_solution = { ...(next.steps.step5_solution || {}), ...patch }
          break
        case 6:
          next.steps.step6_market = { ...(next.steps.step6_market || {}), ...patch }
          break
        case 7:
          next.steps.step7_competition = {
            ...next.steps.step7_competition,
            differentiation: { ...(next.steps.step7_competition.differentiation || {}), ...patch }
          }
          break
        case 8:
          next.steps.step8_founder_team = {
            founder_answers: { ...(next.steps.step8_founder_team.founder_answers || {}), ...patch },
            capabilities: {
              ...(next.steps.step8_founder_team.capabilities || {}),
              ...(patch.capability_map !== undefined ? { capability_map: patch.capability_map } : {}),
              ...(patch.most_critical_gap !== undefined ? { most_critical_gap: patch.most_critical_gap } : {}),
            }
          }
          break
        case 9:
          next.steps.step9_reality_check = {
            ...next.steps.step9_reality_check,
            risks: { ...(next.steps.step9_reality_check.risks || {}), ...patch }
          }
          break
        case 10:
          next.steps.step10_next_move = {
            ...next.steps.step10_next_move,
            next_move: { ...(next.steps.step10_next_move.next_move || {}), ...patch }
          }
          break
      }
      return next
    })
  }, [])

  const flushPending = useCallback(async () => {
    // Wait for any in-flight save first
    if (inFlightRef.current) {
      try { await inFlightRef.current } catch {}
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }

    const patches = pendingPatchesRef.current
    if (patches.size === 0) return

    setSaveStatus('saving')

    const savePromise = (async () => {
      const entries = Array.from(patches.entries())
      pendingPatchesRef.current = new Map()

      try {
        for (const [step, patch] of entries) {
          const res = await fetch(
            `/api/ventures/${slug}/assessment/steps/${step}`,
            {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(patch),
            }
          )
          if (!res.ok) {
            const j = await res.json().catch(() => ({}))
            throw new Error(j.error || `Failed to save step ${step}`)
          }
        }
        setSaveStatus('saved')
        setLastSavedAt(new Date())
        setIsDirty(false)
      } catch (e: any) {
        setSaveStatus('error')
        // Re-queue what we tried to save so user doesn't lose data
        for (const [step, patch] of entries) {
          const existing = pendingPatchesRef.current.get(step) || {}
          pendingPatchesRef.current.set(step, { ...patch, ...existing })
        }
        toast.error(e.message || 'Autosave failed. Will retry.')
        throw e
      }
    })()

    inFlightRef.current = savePromise
    try { await savePromise } finally { inFlightRef.current = null }
  }, [slug])

  const updateStepField = useCallback((step: number, patch: Record<string, any>) => {
    // Optimistic local update
    applyLocalPatch(step, patch)
    setIsDirty(true)
    setSaveStatus('idle')

    // Merge into pending
    const existing = pendingPatchesRef.current.get(step) || {}
    pendingPatchesRef.current.set(step, { ...existing, ...patch })

    // Debounce
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = setTimeout(() => {
      flushPending().catch(() => {})
    }, AUTOSAVE_DEBOUNCE_MS)
  }, [applyLocalPatch, flushPending])

  // Flush on unload
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  // ─── STEP HELPERS ───

  const isStepCompleted = useCallback((step: number) => {
    const completedSteps: number[] = data?.assessment?.completed_steps || []
    return completedSteps.includes(step)
  }, [data?.assessment?.completed_steps])

  const canAccessStep = useCallback((step: number) => {
    if (step === 1) return true
    if (step <= (data?.assessment?.current_step || 1)) return true
    if (isStepCompleted(step - 1)) return true
    return false
  }, [data?.assessment?.current_step, isStepCompleted])

  const goToStep = useCallback(async (step: number, markCurrentComplete = false) => {
    if (step < 1 || step > 10) return

    // Flush pending saves
    await flushPending()

    // Optionally mark current step completed and advance server-side
    if (markCurrentComplete) {
      try {
        await fetch(`/api/ventures/${slug}/assessment/steps/${currentStep}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            _markCompleted: true,
            _advanceStep: step === currentStep + 1,
          }),
        })

        // Update local completed_steps
        setData(prev => {
          if (!prev) return prev
          const completed = new Set<number>(prev.assessment?.completed_steps || [])
          completed.add(currentStep)
          return {
            ...prev,
            assessment: {
              ...prev.assessment,
              completed_steps: Array.from(completed).sort((a, b) => a - b),
              current_step: Math.max(prev.assessment?.current_step || 1, step),
            }
          }
        })
      } catch (e) {
        // non-blocking
      }
    }

    setCurrentStep(step)
    router.push(`/ventures/${slug}/assessment/${step}`)
  }, [flushPending, currentStep, slug, router])

  const publishAssessment = useCallback(async () => {
    await flushPending()

    const idempotencyKey = `publish-${slug}-${Date.now()}`
    try {
      const res = await fetch(`/api/ventures/${slug}/assessment/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey,
        },
      })
      const json = await res.json()
      if (!res.ok) {
        return { success: false, error: json.error, missing: json.missing }
      }
      return { success: true }
    } catch (e: any) {
      return { success: false, error: e.message || 'Publish failed' }
    }
  }, [flushPending, slug])

  const value: AssessmentContextValue = {
    slug,
    currentStep,
    data,
    loading,
    error,
    saveStatus,
    lastSavedAt,
    isDirty,
    updateStepField,
    flushPending,
    reload: load,
    goToStep,
    publishAssessment,
    isStepCompleted,
    canAccessStep,
  }

  return (
    <AssessmentContext.Provider value={value}>
      {children}
    </AssessmentContext.Provider>
  )
}

export function useAssessment() {
  const ctx = useContext(AssessmentContext)
  if (!ctx) throw new Error('useAssessment must be used inside <AssessmentProvider>')
  return ctx
}