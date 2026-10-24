'use client'

import { useState, useEffect } from 'react'

export interface DSRTUser {
  id: string
  full_name: string
  username: string
  avatar_url?: string
  tagline?: string
  skills?: string[]
}

export function useDSRTUserSearch(query: string, minLength = 2) {
  const [results, setResults] = useState<DSRTUser[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (query.length < minLength) {
      setResults([])
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)

    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}&limit=8`)
        if (!res.ok) throw new Error('Search failed')
        const data = await res.json()
        if (!cancelled) {
          setResults(data.users || [])
          setError(null)
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 250)

    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [query, minLength])

  return { results, loading, error }
}