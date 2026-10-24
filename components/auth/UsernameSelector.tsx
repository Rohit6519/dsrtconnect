'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export function UsernameSelector({ initialFullName, initialEmail }: { initialFullName?: string; initialEmail?: string }) {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [availability, setAvailability] = useState<{ available: boolean; reason?: string; dsrt_email?: string } | null>(null)
  const [checking, setChecking] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(true)
  const [claiming, setClaiming] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    if (!initialFullName && !initialEmail) return
    loadSuggestions(initialEmail?.split('@')[0] || initialFullName?.toLowerCase().replace(/\s+/g, '') || 'builder')
  }, [initialFullName, initialEmail])

  const loadSuggestions = async (seed: string) => {
    setLoadingSuggestions(true)
    try {
      const res = await fetch('/api/auth/username/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seed, fullName: initialFullName, interests: [], count: 6 })
      })
      const data = await res.json()
      if (data.suggestions) setSuggestions(data.suggestions)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingSuggestions(false)
    }
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (username.length < 3) {
      setAvailability(null)
      return
    }
    setChecking(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/auth/username/check?username=${encodeURIComponent(username)}`)
        setAvailability(await res.json())
      } catch {
        setAvailability({ available: false, reason: 'Verification failed' })
      } finally {
        setChecking(false)
      }
    }, 400)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [username])

  const handleUsernameChange = (val: string) => {
    setUsername(val.toLowerCase().replace(/[^a-z0-9._]/g, ''))
  }

  const pickSuggestion = (s: string) => {
    setUsername(s)
  }

  const claimIdentity = async () => {
    if (!availability?.available) return
    setClaiming(true)
    try {
      const res = await fetch('/api/auth/identity/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to claim identity')
      
      router.push('/onboarding')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Failed to claim identity')
    } finally {
      setClaiming(false)
    }
  }

  return (
    <div className="w-full max-w-[380px] mx-auto">
      <div className="mb-8">
        <h1 className="text-[24px] font-semibold text-white tracking-tight">Claim your identity</h1>
        <p className="text-[14px] text-white/60 mt-1.5">
          Choose a permanent username for your DSRT profile and mail address.
        </p>
      </div>

      <div className="mb-6 space-y-1.5">
        <label className="text-[13px] font-medium text-white/90">Username</label>
        <div className="relative flex items-center">
          <span className="absolute left-3 text-white/40 font-mono text-[14px]">@</span>
          <input
            type="text"
            value={username}
            onChange={(e) => handleUsernameChange(e.target.value)}
            placeholder="username"
            maxLength={30}
            autoFocus
            spellCheck={false}
            className={cn(
              "w-full h-9 pl-8 pr-10 rounded-md bg-transparent border text-[14px] text-white font-mono",
              "focus:outline-none focus:ring-1 transition-colors",
              availability?.available ? "border-emerald-500/50 focus:border-emerald-500 focus:ring-emerald-500/50" :
              availability && !availability.available ? "border-red-500/50 focus:border-red-500 focus:ring-red-500/50" :
              "border-white/15 focus:border-[#4F7CFF] focus:ring-[#4F7CFF]"
            )}
          />
          <div className="absolute right-3 flex items-center">
            {checking && <Loader2 className="w-4 h-4 text-white/40 animate-spin" />}
            {!checking && availability?.available && <Check className="w-4 h-4 text-emerald-400" />}
            {!checking && availability && !availability.available && <X className="w-4 h-4 text-red-400" />}
          </div>
        </div>

        <div className="min-h-[20px] pt-1">
          {username.length > 0 && username.length < 3 && (
            <p className="text-[12px] text-white/50">Username must be at least 3 characters.</p>
          )}
          {username.length >= 3 && !checking && availability && (
            <p className={cn("text-[12px]", availability.available ? "text-white/60" : "text-red-400")}>
              {availability.available 
                ? <span>Your DSRT email will be <strong className="text-white">@{availability.dsrt_email}</strong></span> 
                : availability.reason}
            </p>
          )}
        </div>
      </div>

      <div className="mb-8">
        <p className="text-[12px] font-medium text-white/90 mb-3">Suggestions</p>
        {loadingSuggestions ? (
          <div className="flex flex-wrap gap-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-7 w-24 rounded-md bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => pickSuggestion(s)}
                className={cn(
                  "h-7 px-2.5 rounded-md text-[13px] font-mono transition-colors border",
                  username === s 
                    ? "bg-[#4F7CFF]/10 border-[#4F7CFF]/30 text-[#4F7CFF]" 
                    : "bg-transparent border-white/10 text-white/70 hover:text-white hover:border-white/20"
                )}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={claimIdentity}
        disabled={!availability?.available || claiming || checking}
        className={cn(
          "w-full h-9 rounded-md flex items-center justify-center transition-colors",
          "bg-white text-black text-[14px] font-semibold hover:bg-white/90",
          "disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        {claiming ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : 'Continue'}
      </button>
    </div>
  )
}