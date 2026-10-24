'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { EnvelopeSimple, CircleNotch, ArrowRight } from '@phosphor-icons/react'

export function VerifyEmailScreen({ email }: { email: string }) {
  const router = useRouter()
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''))
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => setCooldown(prev => prev - 1), 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  const handleChange = (index: number, value: string) => {
    if (!/^[0-9]?$/.test(value)) return
    const updated = [...otp]
    updated[index] = value
    setOtp(updated)

    if (value && index < 5) {
      inputsRef.current[index + 1]?.focus()
    }

    if (updated.every(digit => digit !== '')) {
      handleVerify(updated.join(''))
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').trim().slice(0, 6)
    if (/^\d{6}$/.test(pasted)) {
      const digits = pasted.split('')
      setOtp(digits)
      digits.forEach((d, i) => {
        if (inputsRef.current[i]) inputsRef.current[i]!.value = d
      })
      handleVerify(pasted)
    }
  }

  const handleVerify = async (code: string) => {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: code }),
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      toast.success('Email verified successfully!')
      router.push('/auth/username')
    } catch (err: any) {
      toast.error(err.message || 'Verification failed')
      setOtp(Array(6).fill(''))
      inputsRef.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (cooldown > 0 || resending) return
    setResending(true)
    try {
      const res = await fetch('/api/auth/resend-verification', { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to resend code')
      }

      toast.success('New 6-digit verification code sent!')
      setCooldown(60)
    } catch (err: any) {
      toast.error(err.message || 'Failed to resend code')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="w-full max-w-[400px] mx-auto text-center">
      <div className="w-14 h-14 rounded-2xl bg-[#4F7CFF]/10 border border-[#4F7CFF]/30 flex items-center justify-center mx-auto mb-5">
        <EnvelopeSimple className="w-7 h-7 text-[#4F7CFF]" weight="bold" />
      </div>

      <h1 className="text-[22px] font-bold text-white tracking-tight">Verify your email</h1>
      <p className="text-[13px] text-white/60 mt-1.5 leading-relaxed">
        We sent a 6-digit verification code to <br />
        <span className="text-white font-semibold">{email}</span>
      </p>

      {/* 6 OTP Boxes */}
      <div className="flex justify-between gap-2 my-8" onPaste={handlePaste}>
        {otp.map((digit, idx) => (
          <input
            key={idx}
            ref={(el) => {
              inputsRef.current[idx] = el
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(idx, e.target.value)}
            onKeyDown={(e) => handleKeyDown(idx, e)}
            className="w-12 h-14 text-center text-xl font-bold rounded-xl bg-[#0A0D14] border border-white/10 text-white focus:outline-none focus:border-[#4F7CFF] focus:ring-1 focus:ring-[#4F7CFF] transition-all shadow-inner"
          />
        ))}
      </div>

      <button
        onClick={() => handleVerify(otp.join(''))}
        disabled={loading || otp.some(d => !d)}
        className="w-full h-11 rounded-lg bg-[#4F7CFF] hover:bg-[#3D6BF5] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(79,124,255,0.3)] transition-all disabled:opacity-50"
      >
        {loading ? <CircleNotch className="w-5 h-5 animate-spin" /> : <>Verify Code <ArrowRight className="w-4 h-4" weight="bold" /></>}
      </button>

      <div className="mt-6 text-[13px] text-white/50">
        Didn't receive the code?{' '}
        <button
          onClick={handleResend}
          disabled={cooldown > 0 || resending}
          className="text-[#4F7CFF] hover:underline font-semibold disabled:opacity-50"
        >
          {resending ? 'Sending...' : cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}
        </button>
      </div>
    </div>
  )
}