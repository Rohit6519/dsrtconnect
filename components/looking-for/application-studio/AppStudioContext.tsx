'use client'

import { createContext, useContext } from 'react'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export type AppStep = 'profile' | 'experience' | 'questions' | 'evidence' | 'review'

export interface AppDraft {
  application: any
  opportunity: any
  requirements: any[]
  questions: any[]
}

interface AppStudioCtx {
  draft: AppDraft
  setDraft: React.Dispatch<React.SetStateAction<AppDraft | null>>
  updateField: (patch: Record<string, any>) => void
  flushSave: () => Promise<void>
  saveStatus: SaveStatus
  lastSavedAt: Date | null
  step: AppStep
  setStep: (s: AppStep) => void
}

export const AppStudioContext = createContext<AppStudioCtx | null>(null)

export function useAppStudio() {
  const ctx = useContext(AppStudioContext)
  if (!ctx) throw new Error('useAppStudio must be used within AppStudioShell')
  return ctx
}