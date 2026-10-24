'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Shield, Loader2, ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { useOnboardingV2Store } from '@/stores/onboardingV2Store'
import { cn } from '@/lib/utils'

const WEAK_PINS = new Set([
  '000000', '111111', '222222', '333333', '444444', '555555',
  '666666', '777777', '888888', '999999',
  '123456', '654321', '123123', '456789', '789456',
  '121212', '112233', '123321', '098765', '012345',
])

function isSequential(pin: string): boolean {
  let asc = true
  let desc = true
  for (let i = 1; i < pin.length; i++) {
    const a = Number(pin[i - 1])
    const b = Number(pin[i])
    if (b !== a + 1) asc = false
    if (b !== a - 1) desc = false
  }
  return asc || desc
}

function validatePin(pin: string): string | null {
  if (pin.length !== 6) return 'Enter all 6 digits'
  if (!/^\d{6}$/.test(pin)) return 'PIN must contain only numbers'
  if (/^(\d)\1{5}$/.test(pin)) return 'PIN cannot be all same digits'
  if (WEAK_PINS.has(pin)) return 'PIN is too common — choose another'
  if (isSequential(pin)) return 'PIN cannot be a sequence like 123456'
  return null
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  ms = 15000
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

function PinInput({
  value,
  onChange,
  autoFocus = false,
  disabled = false,
}: {
  value: string
  onChange: (v: string) => void
  autoFocus?: boolean
  disabled?: boolean
}) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])
  const digits = value.replace(/\D/g, '').slice(0, 6).split('')
  while (digits.length < 6) digits.push('')

  const emit = (next: string[]) => {
    onChange(next.join('').replace(/\D/g, '').slice(0, 6))
  }

  const handleChange = (idx: number, raw: string) => {
    const cleaned = raw.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[idx] = cleaned
    emit(next)
    if (cleaned && idx < 5) inputsRef.current[idx + 1]?.focus()
  }

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      const next = [...digits]
      next[idx - 1] = ''
      emit(next)
      inputsRef.current[idx - 1]?.focus()
    }
    if (e.key === 'ArrowLeft' && idx > 0) inputsRef.current[idx - 1]?.focus()
    if (e.key === 'ArrowRight' && idx < 5) inputsRef.current[idx + 1]?.focus()
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    onChange(pasted)
    setTimeout(() => {
      inputsRef.current[Math.min(pasted.length, 5)]?.focus()
    }, 0)
  }

  return (
    <div className="flex gap-2" onPaste={handlePaste}>
      {[0, 1, 2, 3, 4, 5].map((idx) => (
        <input
          key={idx}
          ref={(el) => { inputsRef.current[idx] = el }}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          value={digits[idx]}
          onChange={(e) => handleChange(idx, e.target.value)}
          onKeyDown={(e) => handleKeyDown(idx, e)}
          autoFocus={autoFocus && idx === 0}
          disabled={disabled}
          aria-label={`PIN digit ${idx + 1}`}
          className={cn(
            'w-full h-14 text-center text-[20px] font-bold font-mono rounded-md',
            'bg-[#050505] border border-white/10 text-white',
            'focus:outline-none focus:border-[#4F7CFF] focus:ring-1 focus:ring-[#4F7CFF]',
            'transition-all disabled:opacity-40'
          )}
        />
      ))}
    </div>
  )
}

export function SecurityPinStep() {
  const router = useRouter()
  const { setCurrentStep, setStepStates, setOnboardingState, reset } =
    useOnboardingV2Store()

  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [phase, setPhase] = useState<'enter' | 'confirm'>('enter')
  const [saving, setSaving] = useState(false)

  const handleContinuePin = () => {
    if (saving) return
    const err = validatePin(pin)
    if (err) { toast.error(err); return }
    setConfirmPin('')
    setPhase('confirm')
  }

  const handleFinalize = async () => {
    if (saving) return

    if (confirmPin.length !== 6) { toast.error('Enter all 6 digits'); return }
    if (pin !== confirmPin) {
      toast.error('PINs do not match. Try again.')
      setConfirmPin('')
      return
    }
    const err = validatePin(pin)
    if (err) { toast.error(err); setPhase('enter'); setConfirmPin(''); return }

    setSaving(true)
    try {
      const pinRes = await fetchWithTimeout('/api/auth/pin/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, confirmPin }),
      })
      const pinData = await pinRes.json().catch(() => ({} as any))
      if (!pinRes.ok) throw new Error(pinData.error || `Could not save PIN (${pinRes.status})`)

      const stepRes = await fetchWithTimeout('/api/onboarding/step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 'security_pin',
          status: 'COMPLETED',
          data: {},
        }),
      })
      const stepData = await stepRes.json().catch(() => ({} as any))
      if (!stepRes.ok) throw new Error(stepData.error || `Could not save step (${stepRes.status})`)
      if (stepData.step_states) setStepStates(stepData.step_states)
      if (stepData.onboarding_state) setOnboardingState(stepData.onboarding_state)

      const completeRes = await fetchWithTimeout('/api/onboarding/complete', { method: 'POST' })
      if (!completeRes.ok) {
        const errData = await completeRes.json().catch(() => ({} as any))
        throw new Error(errData.error || `Could not complete onboarding (${completeRes.status})`)
      }

      reset()
      toast.success('DSRT Connect setup complete')
      router.push('/welcome')
      router.refresh()
    } catch (e: any) {
      console.error('[SecurityPinStep]', e)
      toast.error(e?.message || 'Something went wrong')
      setSaving(false)
    }
  }

  const goBackToEnter = () => { if (!saving) { setPhase('enter'); setConfirmPin('') } }
  const goBackToPersonalization = () => { if (!saving) setCurrentStep('personalization') }

  const canContinue = phase === 'enter' ? pin.length === 6 : confirmPin.length === 6

  return (
    <div className="space-y-8">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-[#4F7CFF]/10 border border-[#4F7CFF]/20 flex items-center justify-center flex-shrink-0">
          <Shield className="w-5 h-5 text-[#4F7CFF]" />
        </div>
        <div>
          <p className="text-[14px] font-semibold text-white leading-tight">
            {phase === 'enter' ? 'Create your 6-digit DSRT PIN' : 'Confirm your PIN'}
          </p>
          <p className="text-[13px] text-white/60 mt-1 leading-relaxed">
            {phase === 'enter'
              ? 'Use this PIN as a faster alternative to your password. It works from any device where you sign in with your email.'
              : 'Enter the same 6 digits again to confirm.'}
          </p>
        </div>
      </div>

      {phase === 'enter' ? (
        <div className="space-y-3">
          <label className="text-[12px] font-semibold text-white/70 tracking-wide">YOUR PIN</label>
          <PinInput value={pin} onChange={setPin} autoFocus disabled={saving} />
          <p className="text-[11px] text-white/40 mt-2">
            Numeric only. Cannot be repeating (111111) or sequences (123456).
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-[12px] font-semibold text-white/70 tracking-wide">CONFIRM PIN</label>
            <button
              type="button"
              onClick={goBackToEnter}
              disabled={saving}
              className="text-[12px] text-white/50 hover:text-white transition-colors disabled:opacity-40"
            >
              ← Change PIN
            </button>
          </div>
          <PinInput value={confirmPin} onChange={setConfirmPin} autoFocus disabled={saving} />
        </div>
      )}

      <div className="rounded-md border border-white/[0.06] bg-[#0A0A0C] p-4">
        <p className="text-[10px] font-bold text-white/50 tracking-widest uppercase mb-2">
          Why we require a PIN
        </p>
        <p className="text-[12px] text-white/65 leading-relaxed">
          Your DSRT PIN is a fast, secure alternative to typing your full password.
          You can use it on the login screen from any device. If you sign in with
          Google, you can still enter your email + PIN instead.
        </p>
      </div>

      <div className="flex items-center justify-between pt-6 border-t border-white/[0.06]">
        <button
          type="button"
          onClick={phase === 'enter' ? goBackToPersonalization : goBackToEnter}
          disabled={saving}
          className={cn(
            'inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-[13px] font-medium',
            'text-white/60 hover:text-white hover:bg-white/[0.04] transition-all',
            'disabled:opacity-40 disabled:cursor-not-allowed'
          )}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>

        <button
          type="button"
          onClick={phase === 'enter' ? handleContinuePin : handleFinalize}
          disabled={!canContinue || saving}
          className={cn(
            'inline-flex items-center gap-1.5 h-9 px-4 rounded-md text-[13px] font-semibold',
            'bg-white text-black hover:bg-white/90 transition-all',
            'disabled:opacity-40 disabled:cursor-not-allowed'
          )}
        >
          {saving ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Setting up...
            </>
          ) : phase === 'enter' ? (
            <>Continue<ArrowRight className="w-3.5 h-3.5" /></>
          ) : (
            <><Check className="w-3.5 h-3.5" />Complete Setup</>
          )}
        </button>
      </div>
    </div>
  )
}