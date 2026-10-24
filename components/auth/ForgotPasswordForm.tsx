'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { At, CircleNotch, ArrowLeft } from '@phosphor-icons/react'
import { AuthInput } from './AuthInput'
import { cn } from '@/lib/utils'
import type { AuthView } from './AuthShell'

export function ForgotPasswordForm({ onSwitchView }: { onSwitchView: (view: AuthView) => void }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return toast.error('Please enter your email')

    setLoading(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setSent(true)
    } catch (err: any) {
      // Show sent screen regardless to prevent account enumeration
      setSent(true)
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="animate-in fade-in zoom-in duration-300">
        <div className="text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
            <At className="w-6 h-6 text-emerald-400" weight="bold" />
          </div>
          <h1 className="text-[20px] font-bold text-white tracking-tight">Check your email</h1>
          <p className="text-[13px] text-white/60 mt-2 leading-relaxed max-w-[300px] mx-auto">
            If an account exists for <span className="text-white/80 font-semibold">{email}</span>, we've sent a secure reset link.
          </p>
        </div>
        <button 
          onClick={() => onSwitchView('signin')}
          className="w-full h-11 mt-6 rounded-lg border border-white/10 hover:bg-white/5 text-white text-[13px] font-semibold flex items-center justify-center gap-2 transition-all"
        >
          <ArrowLeft className="w-4 h-4" weight="bold" /> Back to sign in
        </button>
      </div>
    )
  }

  return (
    <div className="animate-in fade-in duration-300">
      <div className="text-center mb-6">
        <h1 className="text-[22px] font-bold text-white tracking-tight">Reset your password</h1>
        <p className="text-[13px] text-white/50 mt-1 max-w-[320px] mx-auto">
          Enter your email address and we'll send a secure reset link.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthInput
          label="Email"
          type="email"
          name="email"
          autoFocus
          placeholder="name@example.com"
          leading={<At className="w-4 h-4" weight="bold" />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button
          type="submit"
          disabled={loading || !email}
          className={cn(
            "w-full h-11 rounded-lg mt-2 flex items-center justify-center gap-2",
            "bg-[#4F7CFF] hover:bg-[#3D6BF5] text-white text-[14px] font-bold",
            "shadow-[0_4px_20px_rgba(79,124,255,0.3)] transition-all disabled:opacity-50"
          )}
        >
          {loading ? <CircleNotch className="w-5 h-5 animate-spin" weight="bold" /> : 'Send reset link'}
        </button>
      </form>
      <button 
        onClick={() => onSwitchView('signin')} 
        className="w-full mt-4 text-[13px] text-white/50 hover:text-white/80 font-medium flex items-center justify-center gap-1.5 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
      </button>
    </div>
  )
}