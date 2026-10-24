'use client'

import { createContext, useContext } from 'react'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'offline'

export type StudioStep =
  | 'basics'
  | 'details'
  | 'requirements'
  | 'application'
  | 'workflow'
  | 'distribution'
  | 'review'

export interface StudioDraft {
  opportunity: any
  skill_requirements: any[]
  application_questions: any[]
  media: any[]
  distribution: any[]
}

interface StudioCtx {
  draft: StudioDraft
  setDraft: React.Dispatch<React.SetStateAction<StudioDraft | null>>
  updateField: (patch: Record<string, any>) => void
  flushSave: () => Promise<void>
  refresh: () => Promise<void>
  saveStatus: SaveStatus
  lastSavedAt: Date | null
  step: StudioStep
  setStep: (s: StudioStep) => void
}

export const StudioContext = createContext<StudioCtx | null>(null)

export function useStudio() {
  const ctx = useContext(StudioContext)
  if (!ctx) throw new Error('useStudio must be used within StudioShell')
  return ctx
}