'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Loader2, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type UsernameState = 'IDLE' | 'TYPING' | 'CHECKING' | 'AVAILABLE' | 'TAKEN' | 'INVALID' | 'ERROR'

interface Props {
  value: string
  onChange: (username: string) => void
  onValidityChange?: (isValid: boolean) => void
  currentUserId?: string
  autoFocus?: boolean
  className?: string
}

let activeCheckId = 0

export function UsernameField({ 
  value, 
  onChange, 
  onValidityChange,
  autoFocus,
  className 
}: Props) {
  const [state, setState] = useState<UsernameState>('IDLE')
  const [errorMessage, setErrorMessage] = useState('')
  const debounceRef = useRef<NodeJS.Timeout>()

  const validateFormat = useCallback((val: string): { valid: boolean; reason?: string } => {
    if (val.length === 0) return { valid: false, reason: '' }
    if (val.length < 3) return { valid: false, reason: 'Must be at least 3 characters' }
    if (val.length > 30) return { valid: false, reason: 'Must be 30 characters or less' }
    if (!/^[a-z]/.test(val)) return { valid: false, reason: 'Must start with a letter' }
    if (!/^[a-z0-9._]+$/.test(val)) return { valid: false, reason: 'Only lowercase letters, numbers, dots, underscores' }
    if (/\.\./.test(val)) return { valid: false, reason: 'Cannot contain consecutive dots' }
    if (/__/.test(val)) return { valid: false, reason: 'Cannot contain consecutive underscores' }
    if (/[._]$/.test(val)) return { valid: false, reason: 'Cannot end with dot or underscore' }
    return { valid: true }
  }, [])

  const checkAvailability = useCallback(async (val: string) => {
    const checkId = ++activeCheckId
    setState('CHECKING')

    try {
      const url = new URL('/api/auth/username/check', window.location.origin)
      url.searchParams.set('username', val)

      const res = await fetch(url.toString())
      const data = await res.json()

      if (checkId !== activeCheckId) return

      if (data.available) {
        setState('AVAILABLE')
        setErrorMessage('')
        onValidityChange?.(true)
      } else {
        setState('TAKEN')
        setErrorMessage(data.reason || 'Username is not available')
        onValidityChange?.(false)
      }
    } catch {
      if (checkId === activeCheckId) {
        setState('ERROR')
        setErrorMessage('Could not check availability')
        onValidityChange?.(false)
      }
    }
  }, [onValidityChange])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    const cleaned = value.toLowerCase().trim()

    if (cleaned.length === 0) {
      setState('IDLE')
      setErrorMessage('')
      onValidityChange?.(false)
      return
    }

    const format = validateFormat(cleaned)
    if (!format.valid) {
      setState('INVALID')
      setErrorMessage(format.reason || '')
      onValidityChange?.(false)
      return
    }

    setState('TYPING')
    debounceRef.current = setTimeout(() => {
      checkAvailability(cleaned)
    }, 350)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [value, validateFormat, checkAvailability, onValidityChange])

  const handleInput = (val: string) => {
    const cleaned = val.toLowerCase().replace(/[^a-z0-9._]/g, '')
    onChange(cleaned)
  }

  const dsrtAddress = value ? `${value}@dsrtai.com` : 'username@dsrtai.com'

  return (
    <div className={cn("w-full space-y-3", className)}>
      <div>
        <div className={cn(
          "flex items-center rounded-md border transition-all overflow-hidden bg-[#050505]",
          state === 'AVAILABLE' && "border-emerald-500/40 focus-within:border-emerald-500/60 focus-within:ring-1 focus-within:ring-emerald-500/30",
          (state === 'TAKEN' || state === 'INVALID' || state === 'ERROR') && "border-red-500/40 focus-within:border-red-500/60 focus-within:ring-1 focus-within:ring-red-500/30",
          (state === 'IDLE' || state === 'TYPING' || state === 'CHECKING') && "border-white/10 focus-within:border-[#4F7CFF] focus-within:ring-1 focus-within:ring-[#4F7CFF]"
        )}>
          <span className="pl-3 pr-1 text-white/40 font-mono text-[14px] select-none">@</span>
          <input
            type="text"
            value={value}
            autoFocus={autoFocus}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            maxLength={30}
            placeholder="username"
            onChange={(e) => handleInput(e.target.value)}
            className="flex-1 h-10 pr-10 bg-transparent text-white text-[14px] font-mono placeholder:text-white/30 focus:outline-none"
          />
          <div className="pr-3">
            {state === 'CHECKING' && <Loader2 className="w-4 h-4 animate-spin text-white/40" />}
            {state === 'AVAILABLE' && <Check className="w-4 h-4 text-emerald-400" />}
            {(state === 'TAKEN' || state === 'INVALID' || state === 'ERROR') && <X className="w-4 h-4 text-red-400" />}
          </div>
        </div>

        <div className="min-h-[18px] mt-1.5 px-0.5">
          {state === 'AVAILABLE' && (
            <p className="text-[11px] text-emerald-400 font-medium">Available</p>
          )}
          {(state === 'TAKEN' || state === 'INVALID' || state === 'ERROR') && (
            <p className="text-[11px] text-red-400">{errorMessage}</p>
          )}
          {state === 'IDLE' && (
            <p className="text-[11px] text-white/40">Letters, numbers, dots, and underscores</p>
          )}
        </div>
      </div>

      <div className="rounded-md border border-white/[0.06] bg-[#0A0A0C] p-3">
        <p className="text-[10px] font-bold text-white/40 tracking-widest uppercase mb-1.5">
          Your DSRT workspace address
        </p>
        <p className={cn(
          "text-[14px] font-mono transition-colors",
          state === 'AVAILABLE' ? "text-white" : "text-white/40"
        )}>
          {dsrtAddress}
        </p>
      </div>
    </div>
  )
}