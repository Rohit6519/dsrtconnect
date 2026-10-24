'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Check, Loader2 } from 'lucide-react'
import { useOnboardingV2Store } from '@/stores/onboardingV2Store'
import { UsernameField } from '@/components/primitives/UsernameField'
import { OnboardingFooter } from '@/components/onboarding/OnboardingFooter'
import { cn } from '@/lib/utils'

export function IdentityStep() {
  const { data, updateData, isSaving, setSaving, setCurrentStep, setStepStates, setOnboardingState } = useOnboardingV2Store()
  
  // Local state
  const [username, setUsername] = useState(data.username || '')
  const [isValid, setIsValid] = useState(data.usernameValid || false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(true)

  // Fetch suggestions based on user's name/email context (handled securely by backend)
  const loadSuggestions = useCallback(async () => {
    setLoadingSuggestions(true)
    try {
      // Backend automatically pulls full_name and email from authenticated session context
      const res = await fetch('/api/auth/username/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: 6 })
      })
      const result = await res.json()
      if (result.suggestions) {
        setSuggestions(result.suggestions)
      }
    } catch (err) {
      console.error('[IdentityStep] Suggestion fetch error', err)
    } finally {
      setLoadingSuggestions(false)
    }
  }, [])

  useEffect(() => {
    // Only load suggestions if they don't already have a valid username
    if (!data.usernameValid || !username) {
      loadSuggestions()
    } else {
      setLoadingSuggestions(false)
    }
  }, [data.usernameValid, username, loadSuggestions])

  const handlePickSuggestion = (s: string) => {
    setUsername(s)
  }

  const handleContinue = async () => {
    if (!isValid || !username) return
    
    setSaving(true)
    try {
      // 1. Atomically claim identity
      const claimRes = await fetch('/api/auth/identity/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      })
      
      const claimData = await claimRes.json()
      if (!claimRes.ok) {
        throw new Error(claimData.error || 'Failed to claim username')
      }

      // 2. Persist step completion
      const stepRes = await fetch('/api/onboarding/step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 'identity',
          status: 'COMPLETED',
          data: { username: claimData.username }
        })
      })

      const stepData = await stepRes.json()
      if (!stepRes.ok) {
        throw new Error(stepData.error || 'Failed to save progress')
      }

      // 3. Update global store & advance
      updateData({ 
        username: claimData.username, 
        usernameValid: true 
      })
      
      setStepStates(stepData.step_states)
      setOnboardingState(stepData.onboarding_state)
      setCurrentStep('profile')
      
      toast.success(`Identity claimed: @${claimData.username}`)

    } catch (err: any) {
      toast.error(err.message || 'Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      
      {/* 1. Universal Username Component */}
      <div className="space-y-3">
        <label className="text-[13px] font-medium text-white/90">
          Username
        </label>
        
        <UsernameField 
          value={username}
          onChange={setUsername}
          onValidityChange={setIsValid}
          autoFocus={!data.usernameValid}
        />
        
        <p className="text-[12px] text-white/40 leading-relaxed mt-1">
          Your username is permanent. Once claimed, it cannot be changed easily as it powers your workspace emails and profile links.
        </p>
      </div>

      {/* 2. Intelligent Suggestions */}
      {!data.usernameValid && (
        <div className="space-y-3">
          <p className="text-[11px] font-bold text-white/40 tracking-widest uppercase flex items-center justify-between">
            Suggested for you
            {loadingSuggestions && <Loader2 className="w-3 h-3 animate-spin" />}
          </p>

          <div className="flex flex-wrap gap-2">
            {loadingSuggestions && suggestions.length === 0 ? (
              // Loading skeletons
              [...Array(5)].map((_, i) => (
                <div key={i} className="h-8 w-24 rounded-md bg-white/[0.02] border border-white/5 animate-pulse" />
              ))
            ) : suggestions.length > 0 ? (
              // Actual suggestions
              suggestions.map((s) => {
                const isSelected = username === s
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handlePickSuggestion(s)}
                    className={cn(
                      "h-8 px-3 rounded-md text-[13px] font-mono transition-all flex items-center gap-1.5",
                      isSelected 
                        ? "bg-[#4F7CFF]/10 border border-[#4F7CFF]/40 text-[#7B99FF]" 
                        : "bg-[#050505] border border-white/10 text-white/60 hover:text-white hover:border-white/20"
                    )}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    @{s}
                  </button>
                )
              })
            ) : (
              <p className="text-[12px] text-white/40">Type a username above to check availability.</p>
            )}
          </div>
        </div>
      )}

      {/* 3. Footer Navigation */}
      <OnboardingFooter
        canContinue={isValid && username.length >= 3}
        onContinue={handleContinue}
        isSaving={isSaving}
        isFirst={true}
      />
    </div>
  )
}