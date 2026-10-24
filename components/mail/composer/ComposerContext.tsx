'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

export type ComposeMode = 'new' | 'reply' | 'reply_all' | 'forward'

export interface ComposeInitialState {
  mode?: ComposeMode
  from_identity_id?: string
  to?: any[]
  cc?: any[]
  bcc?: any[]
  subject?: string
  body_html?: string
  attachments?: any[]
  entity_attachments?: any[]
  reply_to_thread_id?: string
  reply_to_message_id?: string
  source_type?: string
  source_entity_type?: string
  source_entity_id?: string
}

interface ComposerContextValue {
  isOpen: boolean
  isFullscreen: boolean
  initialState: ComposeInitialState | null
  openCompose: (state?: ComposeInitialState) => void
  closeCompose: () => void
  toggleFullscreen: () => void
}

const Ctx = createContext<ComposerContextValue | null>(null)

export function ComposerProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [initialState, setInitialState] = useState<ComposeInitialState | null>(null)

  const openCompose = useCallback((state?: ComposeInitialState) => {
    setInitialState(state || {})
    setIsOpen(true)
  }, [])

  const closeCompose = useCallback(() => {
    setIsOpen(false)
    setIsFullscreen(false)
    setInitialState(null)
  }, [])

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(v => !v)
  }, [])

  return (
    <Ctx.Provider value={{ isOpen, isFullscreen, initialState, openCompose, closeCompose, toggleFullscreen }}>
      {children}
    </Ctx.Provider>
  )
}

export function useComposer() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useComposer must be inside ComposerProvider')
  return ctx
}