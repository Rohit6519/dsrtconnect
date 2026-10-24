'use client'

import React, { 
  createContext, useContext, useState, useEffect, 
  useCallback, useMemo, ReactNode 
} from 'react'
import { toast } from 'sonner'

export interface MailIdentity {
  identity_id: string
  entity_type: 'user' | 'project' | 'venture'
  entity_id: string
  dsrt_email: string
  display_name: string
  avatar_url?: string
  role?: 'owner' | 'founder' | 'member'
  unread_count?: number
}

interface MailIdentityContextValue {
  identities: MailIdentity[]
  activeIdentity: MailIdentity | 'unified' | null
  isUnified: boolean
  loading: boolean
  error: string | null
  totalUnread: number
  setActiveIdentity: (id: MailIdentity | 'unified') => void
  refresh: () => Promise<void>
  getIdentityById: (id: string) => MailIdentity | undefined
  getIdentityByEmail: (email: string) => MailIdentity | undefined
}

const MailIdentityContext = createContext<MailIdentityContextValue | null>(null)

const STORAGE_KEY = 'dsrt_mail_active_identity_v2'
const IDENTITY_CHANGED_EVENT = 'mail:identity:changed'

export function MailIdentityProvider({ children }: { children: ReactNode }) {
  const [identities, setIdentities] = useState<MailIdentity[]>([])
  const [activeIdentity, setActiveIdentityState] = 
    useState<MailIdentity | 'unified' | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalUnread, setTotalUnread] = useState(0)

  const fetchIdentities = useCallback(async () => {
    try {
      setError(null)
      const res = await fetch('/api/mail/identities', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      })
      
      if (!res.ok) {
        throw new Error(`Failed to load identities (${res.status})`)
      }

      const data = await res.json()
      const list: MailIdentity[] = data.identities || []
      
      setIdentities(list)
      setTotalUnread(data.total_unread || 0)

      // Restore or default active identity
      const saved = typeof window !== 'undefined' 
        ? localStorage.getItem(STORAGE_KEY) 
        : null

      if (saved === 'unified') {
        setActiveIdentityState('unified')
      } else if (saved) {
        const found = list.find(i => i.identity_id === saved)
        if (found) {
          setActiveIdentityState(found)
        } else {
          // Saved identity no longer exists — fall back to unified
          setActiveIdentityState('unified')
          localStorage.setItem(STORAGE_KEY, 'unified')
        }
      } else {
        // First time — default to Unified Inbox
        setActiveIdentityState('unified')
        localStorage.setItem(STORAGE_KEY, 'unified')
      }
    } catch (e: any) {
      const msg = e?.message || 'Failed to load mail identities'
      setError(msg)
      console.error('Identity load error:', e)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load
  useEffect(() => { 
    fetchIdentities() 
  }, [fetchIdentities])

  // Listen for external identity refresh requests
  useEffect(() => {
    const handler = () => fetchIdentities()
    window.addEventListener('mail:identities:refresh', handler)
    return () => window.removeEventListener('mail:identities:refresh', handler)
  }, [fetchIdentities])

  const setActiveIdentity = useCallback((id: MailIdentity | 'unified') => {
    setActiveIdentityState(id)
    
    if (typeof window !== 'undefined') {
      const storageValue = id === 'unified' ? 'unified' : id.identity_id
      localStorage.setItem(STORAGE_KEY, storageValue)
      
      // Broadcast identity change so other components refresh
      window.dispatchEvent(new CustomEvent(IDENTITY_CHANGED_EVENT, {
        detail: { identity: id }
      }))
    }
  }, [])

  const getIdentityById = useCallback((id: string) => {
    return identities.find(i => i.identity_id === id)
  }, [identities])

  const getIdentityByEmail = useCallback((email: string) => {
    return identities.find(i => 
      i.dsrt_email.toLowerCase() === email.toLowerCase()
    )
  }, [identities])

  const value = useMemo<MailIdentityContextValue>(() => ({
    identities,
    activeIdentity,
    isUnified: activeIdentity === 'unified',
    loading,
    error,
    totalUnread,
    setActiveIdentity,
    refresh: fetchIdentities,
    getIdentityById,
    getIdentityByEmail,
  }), [
    identities, activeIdentity, loading, error, totalUnread,
    setActiveIdentity, fetchIdentities, getIdentityById, getIdentityByEmail
  ])

  return (
    <MailIdentityContext.Provider value={value}>
      {children}
    </MailIdentityContext.Provider>
  )
}

export function useMailIdentity() {
  const ctx = useContext(MailIdentityContext)
  if (!ctx) {
    throw new Error('useMailIdentity must be used within MailIdentityProvider')
  }
  return ctx
}

// Convenience hook: listen to identity changes from anywhere
export function useOnIdentityChange(callback: (identity: MailIdentity | 'unified' | null) => void) {
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      callback(detail?.identity ?? null)
    }
    window.addEventListener(IDENTITY_CHANGED_EVENT, handler)
    return () => window.removeEventListener(IDENTITY_CHANGED_EVENT, handler)
  }, [callback])
}